let tg = window.Telegram.WebApp;
tg.expand();

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const paymentLink = urlParams.get('payment_link');

// Состояние приложения
let currentUser = null;
let currentPage = 'profile';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем данные пользователя
    if (userId) {
        loadUserData();
    }
    
    // Обработчики навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });
    
    // Обработчики для страницы переводов
    document.getElementById('recipient').addEventListener('input', debounce(previewRecipient, 500));
    document.getElementById('send-transfer').addEventListener('click', sendTransfer);
    
    // Обработчики для страницы ссылок
    document.getElementById('create-link').addEventListener('click', createPaymentLink);
    document.getElementById('copy-link').addEventListener('click', copyLink);
    
    // Если есть paymentLink, показываем страницу оплаты
    if (paymentLink) {
        showPaymentPage(paymentLink);
    }
});

// Загрузка данных пользователя
function loadUserData() {
    tg.sendData(JSON.stringify({
        action: 'get_profile',
        user_id: userId
    }));
}

// Обработка данных от бота
tg.onEvent('webAppData', (data) => {
    const response = JSON.parse(data);
    
    if (response.user_id) {
        // Данные профиля
        updateProfile(response);
    } else if (response.history) {
        // История транзакций
        updateHistory(response.history);
    } else if (response.error) {
        showMessage(response.error, 'error');
    } else if (response.success) {
        showMessage('Операция выполнена успешно!', 'success');
        if (response.link) {
            showGeneratedLink(response.link);
        }
        if (response.new_balance) {
            updateBalance(response.new_balance);
        }
    }
});

// Обновление профиля
function updateProfile(data) {
    currentUser = data;
    
    document.getElementById('card-number').textContent = `**** **** **** ${data.user_id.toString().slice(-4)}`;
    document.getElementById('card-holder').textContent = data.first_name;
    document.getElementById('card-balance').textContent = `${data.balance} Aura`;
    document.getElementById('user-id').textContent = data.user_id;
    document.getElementById('username').textContent = data.username || 'Не указан';
}

// Обновление баланса
function updateBalance(newBalance) {
    document.getElementById('card-balance').textContent = `${newBalance} Aura`;
    if (currentUser) {
        currentUser.balance = newBalance;
    }
}

// Переключение страниц
function switchPage(page) {
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
    if (page === 'history') {
        loadHistory();
    }
}

// Загрузка истории
function loadHistory() {
    tg.sendData(JSON.stringify({
        action: 'get_history',
        user_id: userId
    }));
}

// Обновление истории
function updateHistory(transactions) {
    const list = document.getElementById('transactions-list');
    list.innerHTML = '';
    
    if (transactions.length === 0) {
        list.innerHTML = '<p class="no-data">Нет транзакций</p>';
        return;
    }
    
    transactions.forEach(t => {
        const item = document.createElement('div');
        item.className = `transaction-item ${t.type}`;
        
        item.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-counterparty">${t.type === 'outgoing' ? 'Кому: ' + t.to : 'От: ' + t.from}</span>
                <span class="transaction-amount ${t.type}">${t.type === 'outgoing' ? '-' : '+'}${t.amount} Aura</span>
            </div>
            <div class="transaction-details">
                ${t.is_anonymous ? '🔒 Анонимно' : ''} ${t.is_payment_link ? '🔗 По ссылке' : ''}
                ${t.commission ? ` (комиссия: ${t.commission} Aura)` : ''}
            </div>
            <div class="transaction-date">${t.date}</div>
        `;
        
        list.appendChild(item);
    });
}

// Предпросмотр получателя
async function previewRecipient() {
    const input = document.getElementById('recipient');
    const preview = document.getElementById('recipient-preview');
    const previewName = document.getElementById('preview-name');
    const previewAvatar = document.getElementById('preview-avatar');
    
    if (input.value.length < 3) {
        preview.classList.add('hidden');
        return;
    }
    
    // Здесь можно сделать запрос к боту для получения информации о пользователе
    // Пока показываем заглушку
    previewName.textContent = input.value;
    previewAvatar.src = 'https://via.placeholder.com/40';
    preview.classList.remove('hidden');
}

// Отправка перевода
function sendTransfer() {
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;
    const anonymous = document.querySelector('input[name="anonymous"]:checked').value === 'true';
    
    if (!recipient) {
        showMessage('Введите получателя', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showMessage('Введите корректную сумму', 'error');
        return;
    }
    
    tg.sendData(JSON.stringify({
        action: 'send_transfer',
        user_id: userId,
        to_username: recipient,
        amount: amount,
        is_anonymous: anonymous
    }));
}

// Создание платежной ссылки
function createPaymentLink() {
    const amount = document.getElementById('link-amount').value;
    const anonymous = document.querySelector('input[name="link-anonymous"]:checked').value === 'true';
    
    if (!amount || amount <= 0) {
        showMessage('Введите корректную сумму', 'error');
        return;
    }
    
    tg.sendData(JSON.stringify({
        action: 'create_payment_link',
        user_id: userId,
        amount: amount,
        is_anonymous: anonymous
    }));
}

// Показать сгенерированную ссылку
function showGeneratedLink(link) {
    document.getElementById('link-display').classList.remove('hidden');
    document.getElementById('generated-link').value = link;
    showMessage('Ссылка создана!', 'success');
}

// Копирование ссылки
function copyLink() {
    const link = document.getElementById('generated-link');
    link.select();
    document.execCommand('copy');
    showMessage('Ссылка скопирована!', 'success');
}

// Показать страницу оплаты по ссылке
function showPaymentPage(linkId) {
    switchPage('transfer');
    document.getElementById('recipient').value = `По ссылке: ${linkId}`;
    document.getElementById('recipient').disabled = true;
    
    // Здесь можно загрузить информацию о ссылке
}

// Показать сообщение
function showMessage(text, type) {
    const resultDiv = document.getElementById('transfer-result');
    resultDiv.textContent = text;
    resultDiv.className = `result-message ${type}`;
    
    setTimeout(() => {
        resultDiv.textContent = '';
        resultDiv.className = 'result-message';
    }, 3000);
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