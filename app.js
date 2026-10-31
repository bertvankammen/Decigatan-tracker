const schema = [
    { start: 1, end: 3, max: 6, intervalHours: 2, intervalText: "om de 2 uur", note: "" },
    { start: 4, end: 12, max: 5, intervalHours: 2.5, intervalText: "om de 2,5 uur", note: "⚠️ Uiterlijk op dag 5 volledig stoppen met roken!" },
    { start: 13, end: 16, max: 4, intervalHours: 3, intervalText: "om de 3 uur", note: "" },
    { start: 17, end: 20, max: 3, intervalHours: 5, intervalText: "om de 5 uur", note: "" },
    { start: 21, end: 25, max: 2, intervalHours: 8, intervalText: "1 à 2 tabletten per dag", note: "" }
];

let currentDay = parseInt(localStorage.getItem('dec_day')) || 1;
let progress = JSON.parse(localStorage.getItem('dec_progress')) || {};
let startTimes = JSON.parse(localStorage.getItem('dec_startTimes')) || {};

function getSchemaForDay(day) {
    return schema.find(s => day >= s.start && day <= s.end);
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Deze browser ondersteunt helaas geen notificaties.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            document.getElementById('noti-btn').style.display = 'none';
            new Notification("Decigatan Tracker", { body: "Herinneringen zijn succesvol geactiveerd!" });
        }
    });
}

function checkPermissionStatus() {
    if (window.Notification && Notification.permission === "granted") {
        document.getElementById('noti-btn').style.display = 'none';
    }
}

function updateUI() {
    checkPermissionStatus();
    const dayInfo = getSchemaForDay(currentDay);
    if (!dayInfo) return;

    document.getElementById('day-display').innerText = `Dag ${currentDay} van 25`;
    document.getElementById('instruction-display').innerText = `${dayInfo.max} tabletten per dag (${dayInfo.intervalText})`;

    const warningBox = document.getElementById('warning-display');
    if (dayInfo.note) {
        warningBox.innerText = dayInfo.note;
        warningBox.style.display = 'block';
    } else {
        warningBox.style.display = 'none';
    }

    document.getElementById('prev-btn').disabled = currentDay === 1;
    document.getElementById('next-btn').disabled = currentDay === 25;

    const listBox = document.getElementById('pill-list-box');
    listBox.innerHTML = '';

    const takenToday = progress[currentDay] || 0;
    const dayStartTime = startTimes[currentDay];

    for (let i = 1; i <= dayInfo.max; i++) {
        let timeString = "--:--";

        if (dayStartTime) {
            let startTimeDate = new Date(dayStartTime);
            let pillTime = new Date(startTimeDate.getTime() + (i - 1) * dayInfo.intervalHours * 60 * 60 * 1000);
            timeString = pillTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } else if (i === 1) {
            timeString = "Bij inname Pil 1";
        }

        const isTaken = i <= takenToday;

        const row = document.createElement('div');
        row.className = `pill-row ${isTaken ? 'taken' : ''}`;

        row.innerHTML = `
        <div class="pill-info">
            <div class="pill-name">Pil ${i}</div>
            <div class="pill-time">🕒 Tijdstip: ${timeString}</div>
        </div>
        <div class="pill-checkbox" onclick="togglePill(${i})">✓</div>
    `;
        listBox.appendChild(row);
    }

    localStorage.setItem('dec_day', currentDay);
    localStorage.setItem('dec_progress', JSON.stringify(progress));
    localStorage.setItem('dec_startTimes', JSON.stringify(startTimes));
}

function togglePill(pillNumber) {
    let takenToday = progress[currentDay] || 0;
    const dayInfo = getSchemaForDay(currentDay);

    if (pillNumber === 1 && takenToday === 0) {
        startTimes[currentDay] = new Date().toISOString();
        progress[currentDay] = 1;
        planNextNotification(2, dayInfo.intervalHours);
    } else if (pillNumber <= takenToday) {
        progress[currentDay] = pillNumber - 1;
        if (pillNumber === 1) {
            delete startTimes[currentDay];
        }
    } else {
        progress[currentDay] = pillNumber;
        if (pillNumber < dayInfo.max) {
            planNextNotification(pillNumber + 1, dayInfo.intervalHours);
        }
    }
    updateUI();
}

function planNextNotification(nextPillNumber, intervalHours) {
    if (window.Notification && Notification.permission === "granted") {
        const delayInMs = intervalHours * 60 * 60 * 1000;
        setTimeout(() => {
            new Notification("Tijd voor Decigatan!", {
                body: `Het is tijd om Pil ${nextPillNumber} van vandaag te nemen.`,
                icon: "https://placeholder.com"
            });
        }, delayInMs);
    }
}

function changeDay(direction) {
    currentDay += direction;
    updateUI();
}
function resetTracker() {
    if (confirm("Weet je zeker dat je ALLES wilt resetten?")) {
        currentDay = 1;
        progress = {};
        startTimes = {};
        updateUI();
    }
}
updateUI();
