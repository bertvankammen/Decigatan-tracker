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
let isEnteringStartTime = false;

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
            sendBackgroundNotification("Decigatan Tracker", "Herinneringen zijn succesvol geactiveerd!");
        }
    });
}

function checkPermissionStatus() {
    if (window.Notification && Notification.permission === "granted") {
        const notiBtn = document.getElementById('noti-btn');
        if (notiBtn) notiBtn.style.display = 'none';
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
            timeString = formatTime(pillTime);
        } else if (i === 1) {
            timeString = "Bij inname Pil 1";
        }

        const isTaken = i <= takenToday;

        const row = document.createElement('div');
        row.className = `pill-row ${isTaken ? 'taken' : ''}`;

        if (i === 1 && isEnteringStartTime) {
            row.innerHTML = `
            <div class="pill-info">
                <div class="pill-name">Pil 1</div>
                <div class="time-entry">
                    <label for="start-time-input">Ingenomen om</label>
                    <input type="time" id="start-time-input" value="${formatTime(new Date())}">
                </div>
                <div class="time-entry-buttons">
                    <button class="confirm-btn" onclick="confirmStartTime()">Bevestigen</button>
                    <button class="cancel-btn" onclick="cancelStartTime()">Annuleren</button>
                </div>
            </div>
        `;
        } else {
            row.innerHTML = `
            <div class="pill-info">
                <div class="pill-name">Pil ${i}</div>
                <div class="pill-time">🕒 Tijdstip: ${timeString}</div>
            </div>
            <div class="pill-checkbox" onclick="togglePill(${i})">✓</div>
        `;
        }
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
        isEnteringStartTime = true;
    } else if (pillNumber <= takenToday) {
        progress[currentDay] = pillNumber - 1;
        if (pillNumber === 1) {
            delete startTimes[currentDay];
        }
    } else {
        progress[currentDay] = pillNumber;
        if (pillNumber < dayInfo.max) {
            let baseTime = startTimes[currentDay] ? new Date(startTimes[currentDay]) : new Date();
            planNextNotification(pillNumber + 1, dayInfo.intervalHours, baseTime);
        }
    }
    updateUI();
}

function formatTime(date) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function confirmStartTime() {
    const value = document.getElementById('start-time-input').value;
    if (!value) {
        alert("Vul een geldig tijdstip in.");
        return;
    }
    const [hours, minutes] = value.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    const dayInfo = getSchemaForDay(currentDay);
    startTimes[currentDay] = startTime.toISOString();
    progress[currentDay] = 1;
    isEnteringStartTime = false;
    
    if (dayInfo.max > 1) {
        planNextNotification(2, dayInfo.intervalHours, startTime);
    }
    updateUI();
}

function cancelStartTime() {
    isEnteringStartTime = false;
    updateUI();
}

// PWA achtergrond-notificatie helper
function sendBackgroundNotification(title, body) {
    if ('serviceWorker' in navigator && window.Notification && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: 'https://flaticon.com',
                vibrate:,
                badge: 'https://flaticon.com'
            });
        });
    }
}

function planNextNotification(nextPillNumber, intervalHours, fromTime = new Date()) {
    if (window.Notification && Notification.permission === "granted") {
        // Bereken exact doel-tijdstip op basis van starttijd + interval van de vorige pillen
        const pillIndex = nextPillNumber - 1; 
        const targetTimeMs = fromTime.getTime() + (pillIndex * intervalHours * 60 * 60 * 1000);
        const delayInMs = targetTimeMs - Date.now();
        
        if (delayInMs <= 0) return;

        setTimeout(() => {
            sendBackgroundNotification(
                "Tijd voor Decigatan!", 
                `Het is tijd om Pil ${nextPillNumber} van vandaag te nemen.`
            );
        }, delayInMs);
    }
}

function changeDay(direction) {
    currentDay += direction;
    isEnteringStartTime = false;
    updateUI();
}

function resetTracker() {
    if (confirm("Weet je zeker dat je ALLES wilt resetten?")) {
        currentDay = 1;
        progress = {};
        startTimes = {};
        isEnteringStartTime = false;
        updateUI();
    }
}

// Service Worker registreren
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker geregistreerd!', reg))
            .catch(err => console.log('Service Worker faal:', err));
    });
}

updateUI();
