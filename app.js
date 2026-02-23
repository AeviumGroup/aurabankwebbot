// app.js - РАБОЧАЯ ВЕРСИЯ С ДИАГНОСТИКОЙ

let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const paymentLink = urlParams.get('payment_link');

// СОЗДАЕМ ЛОГ НА ЭКРАНЕ ДЛЯ ОТЛАДКИ
function addLog(message) {
    console.log(message);
    const logDiv = document.getElementById('debug-log');
    if (logDiv) {
        const entry = document.createElement('div');
        entry.textContent = new Date().toLocaleTimeString() + ': ' + message;
        logDiv.appendChild(entry);
    }
}

// ДОБАВЛЯЕМ ЛОГ НА СТРАНИЦУ
const debugLog = document.createElement('div');
debugLog.id = 'debug-log';
debugLog.style.cssText = 'position:fixed; top:0; left:0; right:0; background:black; color:lime; font-size:10px; z-index:9999; max-height:100px; overflow-y:auto; padding:5px;';
document.body.appendChild(debugLog);

addLog('App started');
addLog('User ID from URL: ' + userId);
addLog('Telegram WebApp available: ' + !!tg);

// Состояние приложения
let currentUser = null;
let currentPage = 'profile';
let dataRequestSent = false;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    addLog('DOM loaded');
    
    // Пробуем разные способы получить ID
    let finalUserId = userId;
    
    if (!finalUserId && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        finalUserId = tg.initDataUnsafe.user.id;
        addLog('Got user from Telegram: ' + finalUserId);
    }
    
    if (!finalUserId && tg.initDataUnsafe && tg.initDataUnsafe.chat) {
        finalUserId = tg.initDataUnsafe.chat.id;
        addLog('Got chat ID: ' + finalUserId);
    }
    
    if (finalUserId) {
        // Загружаем данные сразу и повторяем попытки
        loadUserData(finalUserId);
        // Повторяем попытку через 2 секунды
        setTimeout(() => loadUserData(finalUserId), 2000);
        // И еще через 5 секунд
        setTimeout(() => loadUserData(finalUserId), 5000);
    } else {
        addLog('ERROR: No user ID found');
        showMessage('Ошибка: не удалось получить ID пользователя', 'error');
    }
    
    // Обработчики навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });
    
    // Обработчики для страницы переводов
    const sendBtn = document.getElementById('send-transfer');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendTransfer);
    }
    
    // Обработчики для страницы ссылок
    const createLinkBtn = document.getElementById('create-link');
    if (createLinkBtn) {
        createLinkBtn.addEventListener('click', createPaymentLink);
    }
    
    const copyBtn = document.getElementById('copy-link');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyLink);
    }
    
    // Если есть paymentLink, показываем страницу оплаты
    if (paymentLink) {
        showPaymentPage(paymentLink);
    }
});

// Загрузка данных пользователя
function loadUserData(id) {
    if (!id) {
        addLog('loadUserData: no ID');
        return;
    }
    
    if (dataRequestSent) {
        addLog('Request already sent, skipping');
        return;
    }
    
    addLog('Sending request for user data, ID: ' + id);
    dataRequestSent = true;
    
    const requestData = {
        action: 'get_profile',
        user_id: parseInt(id)
    };
    
    addLog('Request data: ' + JSON.stringify(requestData));
    
    try {
        tg.sendData(JSON.stringify(requestData));
        addLog('Data sent successfully');
    } catch (e) {
        addLog('Error sending data: ' + e);
        dataRequestSent = false;
    }
}

// Обработка данных от бота
tg.onEvent('webAppData', (data) => {
    addLog('Received data from bot: ' + data);
    
    try {
        const response = JSON.parse(data);
        addLog('Parsed response: ' + JSON.stringify(response));
        
        if (response.error) {
            addLog('Error from bot: ' + response.error);
            showMessage(response.error, 'error');
            dataRequestSent = false; // Можно повторить
            return;
        }
        
        if (response.user_id) {
            addLog('Profile data received');
            updateProfile(response);
            dataRequestSent = false; // Сброс для возможности обновления
        } else if (response.history) {
            addLog('History data received');
            updateHistory(response.history);
        } else if (response.success) {
            addLog('Operation successful');
            showMessage('Операция выполнена успешно!', 'success');
            if (response.link) {
                showGeneratedLink(response.link);
            }
            if (response.new_balance !== undefined) {
                updateBalance(response.new_balance);
            }
        } else {
            addLog('Unknown response format');
        }
    } catch (e) {
        addLog('Error parsing response: ' + e);
        dataRequestSent = false;
    }
});

// Обновление профиля
function updateProfile(data) {
    addLog('Updating profile UI');
    currentUser = data;
    
    const elements = {
        cardNumber: document.getElementById('card-number'),
        cardHolder: document.getElementById('card-holder'),
        cardBalance: document.getElementById('card-balance'),
        userId: document.getElementById('user-id'),
        username: document.getElementById('username')
    };
    
    if (elements.cardNumber) {
        const lastDigits = data.user_id.toString().slice(-4);
        elements.cardNumber.textContent = `**** **** **** ${lastDigits}`;
        addLog('Card number updated');
    }
    if (elements.cardHolder) {
        elements.cardHolder.textContent = data.first_name || 'Пользователь';
    }
    if (elements.cardBalance) {
        elements.cardBalance.textContent = `${data.balance || 0} Aura`;
    }
    if (elements.userId) {
        elements.userId.textContent = data.user_id || '-';
    }
    if (elements.username) {
        elements.username.textContent = data.username || 'Не указан';
    }
    
    showMessage('Данные загружены!', 'success');
}

function updateBalance(newBalance) {
    const cardBalance = document.getElementById('card-balance');
    if (cardBalance) {
        cardBalance.textContent = `${newBalance} Aura`;
    }
    if (currentUser) {
        currentUser.balance = newBalance;
    }
}

function switchPage(page) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });
    
    currentPage = page;
    
    if (page === 'history' && userId) {
        loadHistory();
    }
}

function loadHistory() {
    if (!userId) return;
    
    tg.sendData(JSON.stringify({
        action: 'get_history',
        user_id: parseInt(userId)
    }));
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
    
    tg.sendData(JSON.stringify({
        action: 'send_transfer',
        user_id: parseInt(userId),
        to_username: recipient,
        amount: parseFloat(amount),
        is_anonymous: anonymous
    }));
}

function createPaymentLink() {
    const amount = document.getElementById('link-amount')?.value;
    const anonymous = document.querySelector('input[name="link-anonymous"]:checked')?.value === 'true';
    
    if (!amount) {
        showMessage('Введите сумму', 'error');
        return;
    }
    
    tg.sendData(JSON.stringify({
        action: 'create_payment_link',
        user_id: parseInt(userId),
        amount: parseFloat(amount),
        is_anonymous: anonymous
    }));
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

function showPaymentPage(linkId) {
    switchPage('transfer');
    const recipient = document.getElementById('recipient');
    if (recipient) {
        recipient.value = `По ссылке: ${linkId}`;
        recipient.disabled = true;
    }
}

function showMessage(text, type) {
    addLog(`Message: ${type} - ${text}`);
    
    const activePage = document.querySelector('.page.active');
    const resultDiv = activePage ? activePage.querySelector('.result-message') : null;
    
    if (resultDiv) {
        resultDiv.textContent = text;
        resultDiv.className = `result-message ${type}`;
        
        setTimeout(() => {
            resultDiv.textContent = '';
            resultDiv.className = 'result-message';
        }, 3000);
    }
}

// Добавляем кнопку для повторной загрузки
const reloadBtn = document.createElement('button');
reloadBtn.textContent = '🔄 Перезагрузить данные';
reloadBtn.style.cssText = 'position:fixed; bottom:100px; right:10px; z-index:9999; background:#800020; color:white; border:none; padding:10px; border-radius:5px;';
reloadBtn.onclick = () => {
    dataRequestSent = false;
    if (userId) loadUserData(userId);
};
document.body.appendChild(reloadBtn);