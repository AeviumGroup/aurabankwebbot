// app.js - ИСПРАВЛЕННАЯ РАБОЧАЯ ВЕРСИЯ

let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const paymentLink = urlParams.get('payment_link');

// Лог на экране
function addLog(message) {
    console.log(message);
    const logDiv = document.getElementById('debug-log');
    if (logDiv) {
        const entry = document.createElement('div');
        entry.textContent = new Date().toLocaleTimeString() + ': ' + message;
        logDiv.appendChild(entry);
        // Автоскролл
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

// Добавляем лог на страницу
const debugLog = document.createElement('div');
debugLog.id = 'debug-log';
debugLog.style.cssText = 'position:fixed; top:0; left:0; right:0; background:black; color:#00ff00; font-size:12px; z-index:9999; max-height:150px; overflow-y:auto; padding:8px; font-family:monospace; border-bottom:2px solid #800020;';
document.body.appendChild(debugLog);

addLog('=== AURA BANK STARTED ===');
addLog('User ID: ' + userId);
addLog('Payment Link: ' + paymentLink);

// Состояние
let currentUser = null;
let currentPage = 'profile';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    addLog('DOM loaded');
    
    if (userId) {
        addLog('Sending profile request...');
        sendToBot({
            action: 'get_profile',
            user_id: parseInt(userId)
        });
    } else {
        addLog('ERROR: No user ID');
    }
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });
    
    // Кнопки
    document.getElementById('send-transfer')?.addEventListener('click', sendTransfer);
    document.getElementById('create-link')?.addEventListener('click', createPaymentLink);
    document.getElementById('copy-link')?.addEventListener('click', copyLink);
});

// ОТПРАВКА ДАННЫХ В БОТ
function sendToBot(data) {
    addLog('Sending: ' + JSON.stringify(data));
    tg.sendData(JSON.stringify(data));
}

// ПОЛУЧЕНИЕ ДАННЫХ ОТ БОТА - ЭТО ГЛАВНОЕ!
tg.onEvent('mainButtonClicked', function() {});
tg.onEvent('backButtonClicked', function() {});

// В Telegram WebApp данные приходят через этот обработчик
Telegram.WebApp.onEvent('webAppData', function(data) {
    addLog('RAW data received: ' + data);
    
    try {
        const response = JSON.parse(data);
        addLog('Parsed: ' + JSON.stringify(response));
        
        if (response.user_id) {
            // Данные профиля
            addLog('✅ Updating profile');
            updateProfile(response);
        } else if (response.history) {
            addLog('✅ Updating history');
            updateHistory(response.history);
        } else if (response.success) {
            addLog('✅ Success: ' + JSON.stringify(response));
            if (response.link) {
                showGeneratedLink(response.link);
            }
            showMessage('Успешно!', 'success');
        } else if (response.error) {
            addLog('❌ Error: ' + response.error);
            showMessage(response.error, 'error');
        }
    } catch (e) {
        addLog('❌ Parse error: ' + e);
    }
});

// Также пробуем альтернативный способ
tg.onEvent('webAppData', function(data) {
    addLog('ALT received: ' + data);
});

// Обновление профиля
function updateProfile(data) {
    addLog('Updating UI elements...');
    
    // Карточка
    const cardNumber = document.getElementById('card-number');
    const cardHolder = document.getElementById('card-holder');
    const cardBalance = document.getElementById('card-balance');
    const userIdSpan = document.getElementById('user-id');
    const usernameSpan = document.getElementById('username');
    
    if (cardNumber) {
        const lastDigits = data.user_id.toString().slice(-4);
        cardNumber.textContent = `**** **** **** ${lastDigits}`;
        addLog('Card number updated');
    }
    
    if (cardHolder) {
        cardHolder.textContent = data.first_name || 'Пользователь';
        addLog('Card holder updated');
    }
    
    if (cardBalance) {
        cardBalance.textContent = `${data.balance || 0} Aura`;
        addLog('Balance updated: ' + data.balance);
    }
    
    if (userIdSpan) {
        userIdSpan.textContent = data.user_id || '-';
        addLog('User ID updated');
    }
    
    if (usernameSpan) {
        usernameSpan.textContent = data.username || 'Не указан';
        addLog('Username updated');
    }
    
    addLog('✅ Profile update complete');
    showMessage('Данные загружены!', 'success');
}

function updateBalance(newBalance) {
    const cardBalance = document.getElementById('card-balance');
    if (cardBalance) {
        cardBalance.textContent = `${newBalance} Aura`;
    }
}

function switchPage(page) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });
    
    if (page === 'history' && userId) {
        sendToBot({
            action: 'get_history',
            user_id: parseInt(userId)
        });
    }
}

function updateHistory(transactions) {
    const list = document.getElementById('transactions-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!transactions || transactions.length === 0) {
        list.innerHTML = '<p class="no-data">Нет транзакций</p>';
        return;
    }
    
    transactions.forEach(t => {
        const item = document.createElement('div');
        item.className = `transaction-item ${t.type}`;
        
        item.innerHTML = `
            <div class="transaction-header">
                <span>${t.type === 'outgoing' ? 'Кому: ' + t.to : 'От: ' + t.from}</span>
                <span class="transaction-amount ${t.type}">${t.type === 'outgoing' ? '-' : '+'}${t.amount} Aura</span>
            </div>
            <div class="transaction-details">
                ${t.is_anonymous ? '🔒 Анонимно ' : ''}${t.is_payment_link ? '🔗 По ссылке' : ''}
                ${t.commission ? ` (комиссия: ${t.commission})` : ''}
            </div>
            <div class="transaction-date">${t.date}</div>
        `;
        
        list.appendChild(item);
    });
}

function sendTransfer() {
    const recipient = document.getElementById('recipient')?.value;
    const amount = document.getElementById('amount')?.value;
    const anonymous = document.querySelector('input[name="anonymous"]:checked')?.value === 'true';
    
    if (!recipient || !amount) {
        showMessage('Заполните все поля', 'error');
        return;
    }
    
    sendToBot({
        action: 'send_transfer',
        user_id: parseInt(userId),
        to_username: recipient,
        amount: parseFloat(amount),
        is_anonymous: anonymous
    });
}

function createPaymentLink() {
    const amount = document.getElementById('link-amount')?.value;
    const anonymous = document.querySelector('input[name="link-anonymous"]:checked')?.value === 'true';
    
    if (!amount) {
        showMessage('Введите сумму', 'error');
        return;
    }
    
    sendToBot({
        action: 'create_payment_link',
        user_id: parseInt(userId),
        amount: parseFloat(amount),
        is_anonymous: anonymous
    });
}

function showGeneratedLink(link) {
    const linkDisplay = document.getElementById('link-display');
    const generatedLink = document.getElementById('generated-link');
    
    if (linkDisplay) linkDisplay.classList.remove('hidden');
    if (generatedLink) generatedLink.value = link;
}

function copyLink() {
    const link = document.getElementById('generated-link');
    if (!link) return;
    
    link.select();
    document.execCommand('copy');
    showMessage('Ссылка скопирована!', 'success');
}

function showMessage(text, type) {
    addLog(`Message: ${type} - ${text}`);
    
    const resultDiv = document.getElementById('transfer-result');
    if (resultDiv) {
        resultDiv.textContent = text;
        resultDiv.className = `result-message ${type}`;
        
        setTimeout(() => {
            resultDiv.textContent = '';
            resultDiv.className = 'result-message';
        }, 3000);
    }
}

// Кнопка принудительного обновления
const refreshBtn = document.createElement('button');
refreshBtn.innerHTML = '🔄';
refreshBtn.style.cssText = 'position:fixed; bottom:100px; right:10px; z-index:9999; background:#800020; color:white; border:none; width:50px; height:50px; border-radius:25px; font-size:24px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.3);';
refreshBtn.onclick = () => {
    if (userId) {
        addLog('Manual refresh');
        sendToBot({
            action: 'get_profile',
            user_id: parseInt(userId)
        });
    }
};
document.body.appendChild(refreshBtn);

addLog('App initialized, waiting for data...');