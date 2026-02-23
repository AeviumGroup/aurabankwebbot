// app.js - МАКСИМАЛЬНО ПРОСТАЯ ВЕРСИЯ

let tg = window.Telegram.WebApp;
tg.expand();

// Получаем ID из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');

console.log('START: userId =', userId);

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Показываем что у нас есть
    document.getElementById('card-holder').textContent = 'Загрузка...';
    document.getElementById('user-id').textContent = userId || '-';
    
    // Отправляем запрос
    if (userId) {
        const data = {
            action: 'get_profile',
            user_id: parseInt(userId)
        };
        console.log('Sending:', data);
        tg.sendData(JSON.stringify(data));
    }
});

// Получаем ответ
tg.onEvent('webAppData', function(data) {
    console.log('GOT DATA:', data);
    
    try {
        const response = JSON.parse(data);
        console.log('Parsed:', response);
        
        if (response.user_id) {
            // Обновляем ВСЕ элементы
            document.getElementById('card-number').textContent = '**** **** **** ' + response.user_id.toString().slice(-4);
            document.getElementById('card-holder').textContent = response.first_name || 'Пользователь';
            document.getElementById('card-balance').textContent = (response.balance || 0) + ' Aura';
            document.getElementById('user-id').textContent = response.user_id;
            document.getElementById('username').textContent = response.username || 'Не указан';
            
            console.log('Profile updated!');
        }
    } catch(e) {
        console.error('Error:', e);
    }
});

// Простая функция для теста
window.testUpdate = function() {
    document.getElementById('card-holder').textContent = 'ТЕСТ';
    document.getElementById('card-balance').textContent = '9999 Aura';
    document.getElementById('user-id').textContent = '123456';
    document.getElementById('username').textContent = 'test_user';
};
