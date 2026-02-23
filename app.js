// app.js - ИСПРАВЛЕННАЯ РАБОЧАЯ ВЕРСИЯ

let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const paymentLink = urlParams.get('payment_link');

console.log('=== AURA BANK WEBAPP STARTED ===');
console.log('User ID from URL:', userId);
console.log('Payment Link:', paymentLink);
console.log('Telegram WebApp:', tg.initDataUnsafe);

// Состояние приложения
let currentUser = null;
let currentPage = 'profile';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, userId:', userId);
    
    // Загружаем данные пользователя сразу
    if (userId) {
        loadUserData(userId);
    } else {
        console.warn('No user ID in URL, trying to get from Telegram');
        // Пробуем получить из Telegram WebApp
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const tgUserId = tg.initDataUnsafe.user.id;
            console.log('Got user from Telegram:', tgUserId);
            loadUserData(tgUserId);
        } else {
            console.error('Could not get user ID');
            showMessage('Ошибка: не удалось получить ID пользователя', 'error');
        }
    }
    
    // Обработчики навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });
    
    // Обработчики для страницы переводов
    const recipientInput = document.getElementById('recipient');
    if (recipientInput) {
        recipientInput.addEventListener('input', debounce(previewRecipient, 500));
    }
    
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
        console.error('No user ID provided');
        return;
    }
    
    console.log('Sending request for user data, ID:', id);
    
    // Отправляем запрос в бот
    const requestData = {
        action: 'get_profile',
        user_id: parseInt(id)
    };
    
    console.log('Request data:', requestData);
    tg.sendData(JSON.stringify(requestData));
}

// Обработка данных от бота
tg.onEvent('webAppData', (data) => {
    console.log('Received raw data from bot:', data);
    
    try {
        const response = JSON.parse(data);
        console.log('Parsed response:', response);
        
        if (response.error) {
            console.error('Error from bot:', response.error);
            showMessage(response.error, 'error');
            return;
        }
        
        if (response.user_id) {
            // Данные профиля
            console.log('Updating profile with:', response);
            updateProfile(response);
        } else if (response.history) {
            // История транзакций
            console.log('Updating history with:', response.history);
            updateHistory(response.history);
        } else if (response.success) {
            console.log('Operation successful:', response);
            showMessage('Операция выполнена успешно!', 'success');
            if (response.link) {
                showGeneratedLink(response.link);
            }
            if (response.new_balance !== undefined) {
                updateBalance(response.new_balance);
            }
            // Обновляем профиль после успешной операции
            if (userId) {
                setTimeout(() => loadUserData(userId), 1000);
            }
        } else {
            console.warn('Unknown response format:', response);
        }
    } catch (e) {
        console.error('Error parsing response:', e);
        showMessage('Ошибка при обработке ответа', 'error');
    }
});

// Обновление профиля
function updateProfile(data) {
    console.log('Updating UI with profile data:', data);
    currentUser = data;
    
    // Обновляем карту
    const cardNumber = document.getElementById('card-number');
    const cardHolder = document.getElementById('card-holder');
    const cardBalance = document.getElementById('card-balance');
    const userIdSpan = document.getElementById('user-id');
    const usernameSpan = document.getElementById('username');
    
    if (cardNumber) {
        const lastDigits = data.user_id.toString().slice(-4);
        cardNumber.textContent = `**** **** **** ${lastDigits}`;
    }
    if (cardHolder) {
        cardHolder.textContent = data.first_name || 'Пользователь';
    }
    if (cardBalance) {
        cardBalance.textContent = `${data.balance || 0} Aura`;
    }
    if (userIdSpan) {
        userIdSpan.textContent = data.user_id || '-';
    }
    if (usernameSpan) {
        usernameSpan.textContent = data.username || 'Не указан';
    }
    
    console.log('Profile updated successfully');
}

// Обновление баланса
function updateBalance(newBalance) {
    const cardBalance = document.getElementById('card-balance');
    if (cardBalance) {
        cardBalance.textContent = `${newBalance} Aura`;
    }
    if (currentUser) {
        currentUser.balance = newBalance;
    }
}

// Переключение страниц
function switchPage(page) {
    console.log('Switching to page:', page);
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    // Обновляем страницу
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });
    
    currentPage = page;
    
    // Загружаем данные для страницы
    if (page === 'history' && userId) {
        loadHistory();
    }
}

// Загрузка истории
function loadHistory() {
    if (!userId) {
        console.error('No user ID for history');
        return;
    }
    
    console.log('Loading history for user:', userId);
    
    tg.sendData(JSON.stringify({
        action: 'get_history',
        user_id: parseInt(userId)
    }));
}

// Обновление истории
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
        
        const amount = t.type === 'outgoing' ? t.amount : t.amount;
        const sign = t.type === 'outgoing' ? '-' : '+';
        
        item.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-counterparty">${t.type === 'outgoing' ? 'Кому: ' + t.to : 'От: ' + t.from}</span>
                <span class="transaction-amount ${t.type}">${sign}${amount} Aura</span>
            </div>
            <div class="transaction-details">
                ${t.is_anonymous ? '🔒 Анонимно ' : ''}${t.is_payment_link ? '🔗 По ссылке' : ''}
                ${t.commission ? ` (комиссия: ${t.commission} Aura)` : ''}
            </div>
            <div class="transaction-date">${t.date}</div>
        `;
        
        list.appendChild(item);
    });
}

// Предпросмотр получателя
function previewRecipient() {
    const input = document.getElementById('recipient');
    const preview = document.getElementById('recipient-preview');
    const previewName = document.getElementById('preview-name');
    const previewAvatar = document.getElementById('preview-avatar');
    
    if (!input || !preview) return;
    
    if (input.value.length < 3) {
        preview.classList.add('hidden');
        return;
    }
    
    // Показываем заглушку
    if (previewName) previewName.textContent = input.value;
    if (previewAvatar) previewAvatar.src = 'https://via.placeholder.com/40';
    preview.classList.remove('hidden');
}

// Отправка перевода
function sendTransfer() {
    const recipient = document.getElementById('recipient')?.value;
    const amount = document.getElementById('amount')?.value;
    const anonymous = document.querySelector('input[name="anonymous"]:checked')?.value === 'true';
    
    if (!recipient) {
        showMessage('Введите получателя', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showMessage('Введите корректную сумму', 'error');
        return;
    }
    
    if (!userId && !currentUser) {
        showMessage('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    const idToUse = userId || (currentUser ? currentUser.user_id : null);
    
    if (!idToUse) {
        showMessage('Ошибка: не удалось определить пользователя', 'error');
        return;
    }
    
    console.log('Sending transfer:', { recipient, amount, anonymous });
    
    tg.sendData(JSON.stringify({
        action: 'send_transfer',
        user_id: parseInt(idToUse),
        to_username: recipient,
        amount: parseFloat(amount),
        is_anonymous: anonymous
    }));
}

// Создание платежной ссылки
function createPaymentLink() {
    const amount = document.getElementById('link-amount')?.value;
    const anonymous = document.querySelector('input[name="link-anonymous"]:checked')?.value === 'true';
    
    if (!amount || amount <= 0) {
        showMessage('Введите корректную сумму', 'error');
        return;
    }
    
    if (!userId && !currentUser) {
        showMessage('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    const idToUse = userId || (currentUser ? currentUser.user_id : null);
    
    if (!idToUse) {
        showMessage('Ошибка: не удалось определить пользователя', 'error');
        return;
    }
    
    console.log('Creating payment link:', { amount, anonymous });
    
    tg.sendData(JSON.stringify({
        action: 'create_payment_link',
        user_id: parseInt(idToUse),
        amount: parseFloat(amount),
        is_anonymous: anonymous
    }));
}

// Показать сгенерированную ссылку
function showGeneratedLink(link) {
    const linkDisplay = document.getElementById('link-display');
    const generatedLink = document.getElementById('generated-link');
    
    if (linkDisplay) linkDisplay.classList.remove('hidden');
    if (generatedLink) generatedLink.value = link;
    showMessage('Ссылка создана!', 'success');
}

// Копирование ссылки
function copyLink() {
    const link = document.getElementById('generated-link');
    if (!link) return;
    
    link.select();
    document.execCommand('copy');
    showMessage('Ссылка скопирована!', 'success');
}

// Показать страницу оплаты по ссылке
function showPaymentPage(linkId) {
    console.log('Showing payment page for link:', linkId);
    switchPage('transfer');
    const recipient = document.getElementById('recipient');
    if (recipient) {
        recipient.value = `По ссылке: ${linkId}`;
        recipient.disabled = true;
    }
}

// Показать сообщение
function showMessage(text, type) {
    console.log('Message:', type, text);
    
    // Пробуем показать в активной странице
    const activePage = document.querySelector('.page.active');
    const resultDiv = activePage ? activePage.querySelector('.result-message') : null;
    
    if (resultDiv) {
        resultDiv.textContent = text;
        resultDiv.className = `result-message ${type}`;
        
        setTimeout(() => {
            resultDiv.textContent = '';
            resultDiv.className = 'result-message';
        }, 3000);
    } else {
        // Если не нашли, показываем в консоли
        console.log(`${type.toUpperCase()}: ${text}`);
    }
}

// Debounce функция
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Добавляем обработчик ошибок
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', msg, 'at', lineNo);
    showMessage('Произошла ошибка', 'error');
    return false;
};

console.log('App.js loaded and initialized');