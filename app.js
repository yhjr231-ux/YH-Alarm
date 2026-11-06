const AlarmPlugin = window.Capacitor?.Plugins?.AlarmPlugin;
const customSoundFileInput = document.getElementById("custom-sound-file");

let customSoundURL = null;
let customSoundName = "";
let customSoundFile = null;
let soundDB = null;

function openSoundDatabase() {
    return new Promise(function (resolve, reject) {
        const request = indexedDB.open("YHAlarmDB", 1);

        request.onupgradeneeded = function () {
            const db = request.result;

            if (!db.objectStoreNames.contains("customSounds")) {
                db.createObjectStore("customSounds");
            }
        };

        request.onsuccess = function () {
            soundDB = request.result;
            resolve(soundDB);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}
async function saveCustomSound(file) {
    const db = soundDB || await openSoundDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = db.transaction(
            "customSounds",
            "readwrite"
        );

        const store = transaction.objectStore("customSounds");

        store.put(file, "selectedSound");

        transaction.oncomplete = function () {
            resolve();
        };

        transaction.onerror = function () {
            reject(transaction.error);
        };
    });
}
async function loadCustomSound() {
    const db = soundDB || await openSoundDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = db.transaction(
            "customSounds",
            "readonly"
        );

        const store = transaction.objectStore("customSounds");
        const request = store.get("selectedSound");

        request.onsuccess = function () {
            resolve(request.result || null);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}
function updateClock() {
    const now = new Date();

    const time = now.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });

    const date = now.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    document.getElementById("current-time").textContent = time;
    document.getElementById("current-date").textContent = date;
}

updateClock();

setInterval(updateClock, 1000);

const addAlarmButton = document.getElementById("add-alarm");
const alarmModal = document.getElementById("alarm-modal");
const cancelAlarmButton = document.getElementById("cancel-alarm");

addAlarmButton.addEventListener("click", function () {

    alarmToEdit = null;

    customSoundPath = null;
    customSoundAbsolutePath = null;
    customSoundURL = null;

    if (alarmSound.value === "custom") {
        alarmSound.value = "default";
    }

    selectedSoundName.textContent = "لم يتم اختيار صوت";

    document.getElementById("alarm-modal-title").textContent =
        "إضافة منبّه جديد";

    alarmModal.classList.remove("hidden");
});

cancelAlarmButton.addEventListener("click", function () {
    stopPreviewAudio();
    alarmModal.classList.add("hidden");
});

const alarmTimeInput = document.getElementById("alarm-time");
const saveAlarmButton = document.getElementById("save-alarm");
const alarmsList = document.getElementById("alarms-list");

const deleteModal = document.getElementById("delete-modal");
const confirmDeleteButton = document.getElementById("confirm-delete");
const cancelDeleteButton = document.getElementById("cancel-delete");

let alarmToDelete = null;
let alarmToEdit = null;

let alarms = JSON.parse(localStorage.getItem("yh-alarms")) || [];

function generateAlarmId() {
    let id;

    do {
        id = Math.floor(Math.random() * 2147483647) + 1;
    } while (alarms.some(alarm => alarm.id === id));

    return id;
}
function getNextAlarmTime(alarm) {
    const now = new Date();
    const [hours, minutes] = alarm.time.split(":").map(Number);

    for (let i = 0; i < 8; i++) {
        const date = new Date(now);

        date.setDate(now.getDate() + i);
        date.setHours(hours, minutes, 0, 0);

        if (date <= now) continue;

        const day = date.getDay();

        if (alarm.repeat === "once" && i > 0) {
            return null;
        }

        if (
    alarm.repeat === "specific" &&
    !(alarm.days || []).includes(day)
) {
            continue;
        }

        return date.getTime();
    }

    return null;
}
async function scheduleNativeAlarm(alarm) {
    if (!AlarmPlugin) return;

    if (!alarm.enabled) {
        await AlarmPlugin.cancelAlarm({
            alarmId: alarm.id
        });
        return;
    }

    const triggerAtMillis = getNextAlarmTime(alarm);

    if (!triggerAtMillis) {
    await AlarmPlugin.cancelAlarm({
        alarmId: alarm.id
    });
    return;
}

    await AlarmPlugin.scheduleAlarm({
        triggerAtMillis: triggerAtMillis,
        alarmId: alarm.id,
        alarmName: alarm.name,
        alarmTime: alarm.time,
        repeat: alarm.repeat,
        days: alarm.days || [],
        snooze: Number(alarm.snooze || 5),
        sound: alarm.sound || "default",
customSound: alarm.customSound || null
    });
}
alarms.forEach(function (alarm) {
    if (
        !Number.isInteger(alarm.id) ||
        alarm.id <= 0 ||
        alarm.id > 2147483647
    ) {
        alarm.id = generateAlarmId();
    }
});

saveAlarms();
function saveAlarms() {
    localStorage.setItem("yh-alarms", JSON.stringify(alarms));
}
const weekDays = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت"
];

function displayAlarms() {
    alarmsList.innerHTML = "";

    alarms.forEach(function (alarm, index) {
        const alarmItem = document.createElement("div");
        alarmItem.className = "alarm-card";

        const formattedTime = new Date(
            `2000-01-01T${alarm.time}`
        ).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        let repeatText = "مرة واحدة";

        if (alarm.repeat === "daily") {
            repeatText = "كل يوم";
        } else if (alarm.repeat === "specific") {
            repeatText = alarm.days
                .map(day => weekDays[day])
                .join("، ");
        }

        alarmItem.innerHTML = `
            <div class="alarm-top">
                <div class="alarm-info">
                    <h3>${formattedTime}</h3>
                    <p>${alarm.name}</p>
                    <small>${repeatText}</small>
                </div>

                <span class="alarm-status ${alarm.enabled ? "" : "disabled"}">
    ${alarm.enabled ? "مفعّل" : "متوقف"}
</span>
            </div>

            <div class="alarm-bottom">
                <div class="alarm-actions">
                    <button class="toggle-alarm">⏻</button>
                    <button class="delete-alarm">🗑</button>
                    <button class="edit-alarm">✎</button>
                </div>

                <span>تعديل المنبّه</span>
            </div>
        `;

        alarmsList.appendChild(alarmItem);
    });
}

alarmsList.addEventListener("click", function (event) {
    const alarmCard = event.target.closest(".alarm-card");

    if (!alarmCard) return;

    const index = Array.from(alarmsList.children).indexOf(alarmCard);

    if (event.target.closest(".toggle-alarm")) {
       alarms[index].enabled = !alarms[index].enabled;

saveAlarms();
displayAlarms();

if (window.Capacitor?.getPlatform?.() === "android") {
    scheduleNativeAlarm(alarms[index]).catch(error => {
        console.error("Native alarm toggle error:", error);
    });
}
    }

    if (event.target.closest(".delete-alarm")) {
    alarmToDelete = index;
    deleteModal.classList.remove("hidden");
}
if (event.target.closest(".edit-alarm")) {
    alarmToEdit = index;

    const alarm = alarms[index];

    document.getElementById("alarm-modal-title").textContent =
        "تعديل المنبّه";

    document.getElementById("alarm-name").value = alarm.name;
    alarmTimeInput.value = alarm.time;
    repeatSelect.value = alarm.repeat;
alarmSound.value = alarm.sound || "default";
snoozeDuration.value = alarm.snooze || "5";

if (alarm.customSound) {
    customSoundPath = alarm.customSound;

    customSoundAbsolutePath =
        alarm.customSoundAbsolutePath || null;

    customSoundURL =
    customSoundAbsolutePath &&
    window.Capacitor?.convertFileSrc
        ? window.Capacitor.convertFileSrc(customSoundAbsolutePath)
        : null;

    selectedSoundName.textContent = "الصوت المخصص";
} else {
    customSoundPath = null;
    customSoundAbsolutePath = null;
    customSoundURL = null;
    selectedSoundName.textContent = "لم يتم اختيار صوت";
}
    daysContainer.classList.toggle(
        "hidden",
        alarm.repeat !== "specific"
    );

    document.querySelectorAll("#days-container input").forEach(function (checkbox) {
        checkbox.checked = alarm.days.includes(Number(checkbox.value));
    });

    alarmModal.classList.remove("hidden");
}
});

saveAlarmButton.addEventListener("click", function () {
    const name = document.getElementById("alarm-name").value.trim();
    const time = alarmTimeInput.value;
    const repeat = repeatSelect.value;

    if (name === "" || time === "") {
        alert("اكتب اسم المنبّه واختر وقته!");
        return;
    }

    const selectedDays = Array.from(
        document.querySelectorAll("#days-container input:checked")
    ).map(function (checkbox) {
        return Number(checkbox.value);
    });

    if (repeat === "specific" && selectedDays.length === 0) {
        alert("اختر يومًا واحدًا على الأقل!");
        return;
    }
if (alarmSound.value === "custom" && !customSoundPath) {
    alert("اختار ملف صوت مخصص الأول!");
    return;
}
    const newAlarm = {
    id: alarmToEdit !== null
    ? alarms[alarmToEdit].id
    : generateAlarmId(),
    name: name,
    time: time,
    repeat: repeat,
    days: selectedDays,
    sound: alarmSound.value,
    customSound: alarmSound.value === "custom" ? customSoundPath : null,
customSoundAbsolutePath: alarmSound.value === "custom" ? customSoundAbsolutePath : null,
    snooze: snoozeDuration.value,
    enabled: true
};

    if (alarmToEdit !== null) {
    alarms[alarmToEdit] = {
        ...newAlarm,
        enabled: alarms[alarmToEdit].enabled
    };

    alarmToEdit = null;
} else {
    alarms.push(newAlarm);
}
saveAlarms();
    displayAlarms();
if (window.Capacitor?.getPlatform?.() === "android") {
    scheduleNativeAlarm(newAlarm).catch(error => {
        console.error("Native alarm scheduling error:", error);
    });
}
    document.getElementById("alarm-name").value = "";
    alarmTimeInput.value = "";
    repeatSelect.value = "daily";
    daysContainer.classList.add("hidden");

    document.querySelectorAll("#days-container input").forEach(function (checkbox) {
        checkbox.checked = false;
    });
document.getElementById("alarm-modal-title").textContent =
    "إضافة منبّه جديد";
    stopPreviewAudio();

    alarmModal.classList.add("hidden");
});


const repeatSelect = document.getElementById("alarm-repeat");
const daysContainer = document.getElementById("days-container");

repeatSelect.addEventListener("change", function () {
    if (repeatSelect.value === "specific") {
        daysContainer.classList.remove("hidden");
    } else {
        daysContainer.classList.add("hidden");
    }
});
confirmDeleteButton.addEventListener("click", function () {
    if (alarmToDelete !== null) {
        const deletedAlarm = alarms[alarmToDelete];

alarms.splice(alarmToDelete, 1);

saveAlarms();
displayAlarms();

if (window.Capacitor?.getPlatform?.() === "android") {
    AlarmPlugin.cancelAlarm({
        alarmId: deletedAlarm.id
    }).catch(error => {
        console.error("Native alarm cancellation error:", error);
    });
}
    }

    alarmToDelete = null;
    deleteModal.classList.add("hidden");
});

cancelDeleteButton.addEventListener("click", function () {
    alarmToDelete = null;
    deleteModal.classList.add("hidden");
});
displayAlarms();
if (window.Capacitor?.getPlatform?.() === "android") {
    alarms.forEach(function (alarm) {
        scheduleNativeAlarm(alarm).catch(error => {
            console.error("Native alarm scheduling error:", error);
        });
    });
}

// Settings Inputs
const snoozeDuration = document.getElementById("snooze-duration");
const alarmSound = document.getElementById("alarm-sound");

const selectedSoundName = document.getElementById("selected-sound-name");
const previewSoundBtn = document.getElementById("preview-sound");


let customSoundPath = null;
let customSoundAbsolutePath = null;


alarmSound.addEventListener("change", async function () {
    if (alarmSound.value !== "custom") return;

    // نسخة Android
    if (window.Capacitor?.getPlatform?.() === "android") {
        try {
            const result = await AlarmPlugin.chooseAudioFile();

            if (!result || !result.filePath || !result.absolutePath) {
                alarmSound.value = settings.sound || "default";
                return;
            }

            customSoundPath = result.filePath;
            customSoundAbsolutePath = result.absolutePath;
            customSoundURL = window.Capacitor.convertFileSrc(
                customSoundAbsolutePath
            );

            selectedSoundName.textContent = result.fileName;
        } catch (error) {
            console.error("Audio selection error:", error);
            alarmSound.value = settings.sound || "default";
            alert("حصلت مشكلة أثناء اختيار ملف الصوت!");
        }

        return;
    }

    // نسخة المتصفح
    customSoundFileInput.click();
});

customSoundFileInput.addEventListener("change", async function () {
    const file = customSoundFileInput.files[0];

    if (!file) {
        alarmSound.value = settings.sound || "default";
        return;
    }

    if (!file.type.startsWith("audio/")) {
        alert("الملف المحدد مش ملف صوت!");
        customSoundFileInput.value = "";
        alarmSound.value = settings.sound || "default";
        return;
    }

    if (customSoundURL) {
        URL.revokeObjectURL(customSoundURL);
    }

    customSoundFile = file;

try {
    await saveCustomSound(file);
} catch (error) {
    console.error("Saving custom sound error:", error);
    alert("حصلت مشكلة أثناء حفظ ملف الصوت!");
    return;
}

customSoundURL = URL.createObjectURL(file);
customSoundName = file.name;
customSoundPath = file.name;
    selectedSoundName.textContent = file.name;
});


let previewAudio = null;
function stopPreviewAudio() {
    if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
        previewAudio = null;
    }
}
previewSoundBtn.addEventListener("click", function () {
console.log("Selected sound:", alarmSound.value);
    // إيقاف أي صوت معاينة سابق
    stopPreviewAudio();

    let soundPath;

    // الصوت المخصص
    if (alarmSound.value === "custom") {
        if (!customSoundURL) {
            alert("اختار ملف صوت الأول!");
            return;
        }

        soundPath = customSoundURL;
    } 

    // الأصوات الجاهزة
    else {
        soundPath = alarmSounds[alarmSound.value] || alarmSounds.default;
    }

    // تشغيل الصوت
    previewAudio = new Audio(soundPath);
    previewAudio.volume = 0.8;

    previewAudio.play().catch(error => {
        console.error("Preview playback error:", error);
        alert("حصلت مشكلة أثناء تشغيل الصوت!");
    });
});


// Load Saved Settings
let settings = JSON.parse(localStorage.getItem("yh-settings")) || {
    snooze: "5",
    sound: "default"
};

// Apply Saved Settings
snoozeDuration.value = settings.snooze;
alarmSound.value = settings.sound;

// Restore Saved Custom Sound
(async function () {
    try {
        const file = await loadCustomSound();

        if (file) {
            customSoundFile = file;
            customSoundURL = URL.createObjectURL(file);
            customSoundName = file.name;
            customSoundPath = file.name;

            if (alarmSound.value === "custom") {
                selectedSoundName.textContent = file.name;
            }
        }
    } catch (error) {
        console.error("Loading custom sound error:", error);
    }
})();
// Ringing Elements
const ringingModal = document.getElementById("ringing-modal");
const ringingAlarmName = document.getElementById("ringing-alarm-name");
const ringingAlarmTime = document.getElementById("ringing-alarm-time");

const snoozeAlarmBtn = document.getElementById("snooze-alarm");
const stopAlarmBtn = document.getElementById("stop-alarm");
let currentRingingAlarm = null;
// Check Alarm Times
function checkAlarms() {
    if (window.Capacitor?.getPlatform?.() === "android") return;

    const now = new Date();

    const currentTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    const currentDay = now.getDay();
    const today = now.toDateString();

    alarms.forEach(function (alarm) {
        if (!alarm.enabled || alarm.time !== currentTime) {
            return;
        }

        if (
            alarm.repeat === "specific" &&
            !alarm.days.includes(currentDay)
        ) {
            return;
        }

        if (alarm._lastTriggered === today) {
            return;
        }

        alarm._lastTriggered = today;

        if (alarm.repeat === "once") {
            alarm.enabled = false;
            saveAlarms();
            displayAlarms();
        }

        currentRingingAlarm = alarm;
        ringingAlarmName.textContent = alarm.name;

        ringingAlarmTime.textContent = new Date(
            `2000-01-01T${currentTime}`
        ).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        ringingModal.classList.remove("hidden");
        startAlarmSound(alarm);
    });
}

// Check every second
setInterval(checkAlarms, 1000);
let customAlarmAudio = null;
let alarmAudio = null;
let volumeIncreaseTimer = null;

function startVolumeIncrease(audio) {
    audio.volume = 0.2;

    if (volumeIncreaseTimer) {
        clearInterval(volumeIncreaseTimer);
    }

    volumeIncreaseTimer = setInterval(function () {
        audio.volume = Math.min(audio.volume + 0.1, 1);

        if (audio.volume >= 1) {
            clearInterval(volumeIncreaseTimer);
            volumeIncreaseTimer = null;
        }
    }, 3000);
}

const alarmSounds = {
    default: "sounds/lesiakower-dreamcore-alarm-clock-581918.mp3",
    digital: "sounds/lesiakower-oversimplified-alarm-clock-113180.mp3",
    gentle: "sounds/microsammy-clock-alarm-8761.mp3",
    birds: "sounds/mixkit-birds-chirping-near-the-river-2473.wav"
};

function startAlarmSound(alarm) {
    if (alarmAudio || customAlarmAudio) return;

    const selectedSound = alarm.sound || settings.sound || "default";

    if (selectedSound === "custom") {
    const soundURL = customSoundURL;

    if (!soundURL) {
        alert("اختار ملف الصوت المخصص الأول!");
        return;
    }
        if (!soundURL) {
            alert("ملف الصوت المخصص غير موجود!");
            return;
        }

        customAlarmAudio = new Audio(soundURL);
        customAlarmAudio.loop = true;
        startVolumeIncrease(customAlarmAudio);

        customAlarmAudio.play().catch(error => {
            console.error("Audio playback error:", error);
        });

        return;
    }

    const soundPath = alarmSounds[selectedSound] || alarmSounds.default;

    alarmAudio = new Audio(soundPath);
    alarmAudio.loop = true;
    startVolumeIncrease(alarmAudio);

    alarmAudio.play().catch(error => {
        console.error("Audio playback error:", error);
    });
}

function stopAlarmSound() {
    if (volumeIncreaseTimer) {
    clearInterval(volumeIncreaseTimer);
    volumeIncreaseTimer = null;
}
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
        alarmAudio = null;
    }

    if (customAlarmAudio) {
        customAlarmAudio.pause();
        customAlarmAudio.currentTime = 0;
        customAlarmAudio = null;
    }
}
stopAlarmBtn.addEventListener("click", function () {
    stopAlarmSound();
    ringingModal.classList.add("hidden");
});
snoozeAlarmBtn.addEventListener("click", function () {
    if (!currentRingingAlarm) return;

    stopAlarmSound();
    ringingModal.classList.add("hidden");

    const minutes = Number(
        currentRingingAlarm.snooze || settings.snooze || 5
    );

    const alarm = currentRingingAlarm;

    setTimeout(function () {
    currentRingingAlarm = alarm;

    const now = new Date();

    ringingAlarmTime.textContent = now.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    ringingModal.classList.remove("hidden");
    startAlarmSound(alarm);
}, minutes * 60 * 1000);
});
// Register Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js")
            .then(function (registration) {
                console.log(
                    "YH Alarm Service Worker registered:",
                    registration.scope
                );
            })
            .catch(function (error) {
                console.error(
                    "Service Worker registration failed:",
                    error
                );
            });
    });
}