// app.js - ДИАГНОСТИЧЕСКАЯ ВЕРСИЯ

let tg = window.Telegram.WebApp;
tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');

console.log('=== START ===');
console.log('User ID from URL:', userId);

// СОЗДАЕМ ОКНО ДЛЯ ЛОГОВ
const logWindow = document.createElement('div');
logWindow.style.cssText = 'position:fixed; bottom:0; left:0; right:0; background:black; color:lime; padding:10px; font-size:12px; z-index:10000; max-height:200px; overflow-y:auto;';
document.body.appendChild(logWindow);

function log(msg) {
    console.log(msg);
    logWindow.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + msg;
    logWindow.scrollTop = logWindow.scrollHeight;
}

log('App started');

document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded');
    
    if (userId) {
        log('Sending request for user ' + userId);
        tg.sendData(JSON.stringify({
            action: 'get_profile',
            user_id: parseInt(userId)
        }));
    } else {
        log('ERROR: No user ID');
    }
});

tg.onEvent('webAppData', function(data) {
    log('RAW DATA: ' + data);
    
    try {
        const response = JSON.parse(data);
        log('PARSED: ' + JSON.stringify(response));
        
        // Проверяем каждое поле
        if (response.user_id) {
            document.getElementById('user-id').textContent = response.user_id;
            document.getElementById('card-number').textContent = '**** **** **** ' + response.user_id.toString().slice(-4);
            log('✓ user_id: ' + response.user_id);
        } else {
            log('✗ user_id missing');
        }
        
        if (response.balance !== undefined) {
            document.getElementById('card-balance').textContent = response.balance + ' Aura';
            log('✓ balance: ' + response.balance);
        } else {
            log('✗ balance missing');
            document.getElementById('card-balance').textContent = '0 Aura';
        }
        
        if (response.first_name) {
            document.getElementById('card-holder').textContent = response.first_name;
            log('✓ first_name: ' + response.first_name);
        } else {
            log('✗ first_name missing');
        }
        
        if (response.username) {
            document.getElementById('username').textContent = response.username;
            log('✓ username: ' + response.username);
        } else {
            log('✗ username missing');
            document.getElementById('username').textContent = 'Не указан';
        }
        
        log('✅ Update complete');
        
    } catch(e) {
        log('ERROR parsing: ' + e);
    }
});

// Кнопка для повторного запроса
const retryBtn = document.createElement('button');
retryBtn.textContent = '🔄 Запросить данные';
retryBtn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:10001; background:#800020; color:white; border:none; padding:10px; border-radius:5px;';
retryBtn.onclick = function() {
    log('Manual retry');
    tg.sendData(JSON.stringify({
        action: 'get_profile',
        user_id: parseInt(userId)
    }));
};
document.body.appendChild(retryBtn);
