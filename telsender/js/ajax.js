jQuery(document).ready(function ($) {
    // Функція анімації для кнопки
    function setButtonState(btn, text, isDisabled = false) {
        $(btn).text(text).prop('disabled', isDisabled);
    }

    // AJAX збереження налаштувань
    $('body').on("click", "#telsetingven", function (e) {
        e.preventDefault();
        const $btn = $(this);
        const formData = $("#formsetinvendor").serialize();

        $.ajax({
            type: 'POST',
            url: ajaxurl,
            // Додаємо nonce для безпеки (має бути локалізований у PHP через wp_localize_script)
            data: 'action=tscfwc_form_reqest&_wpnonce=' + (window.tscfwc_params?.nonce || '') + '&' + formData,
            beforeSend: () => setButtonState($btn, 'Завантаження...', true),
            success: function (response) {
                setButtonState($btn, 'Збережено', false);
                setTimeout(() => setButtonState($btn, 'Зберегти'), 2000);
            },
            error: function (xhr) {
                setButtonState($btn, 'Помилка', false);
                alert('Помилка : ' + xhr.status);
            }
        });
    });

    // Перемикач відображення полів
    function toggleKeyVisibility() {
        const isChecked = $("#sendKey").is(":checked");
        $('.radioinputdefaul, .con-def').toggle(!isChecked);
        $('.radioinputkey, .con-key').toggle(isChecked);
    }

    $("#sendKey").on("change", toggleKeyVisibility);
    toggleKeyVisibility(); // Запуск при завантаженні

    // Ініціалізація плагінів (якщо вони підключені)
    if ($.fn.multiSelect) {
        $("#selinfo, #wpforms_list").multiSelect({
            selectableHeader: "<div class='custom-header'>Усі форми</div>",
            selectionHeader: "<div class='custom-header'>Відправляти в Telegram</div>"
        });
    }

    if ($.fn.selectize) {
        $('#tscfwc_status').selectize({
            plugins: ['remove_button'],
            delimiter: ',',
            persist: false,
            create: (input) => ({ value: input, text: input })
        });
    }
});

/**
 * Оновлення посилання на getUpdates (БЕЗПЕЧНО)
 */
const tokenContainer = document.querySelector('#getUpdates');
if (tokenContainer) {
    const tokenInput = document.querySelector('[name="tscfwc_setting_token"]');
    if (tokenInput && tokenInput.value) {
        const originalHref = tokenContainer.getAttribute('href') || tokenContainer.textContent;
        // Оновлюємо атрибут href, а не весь HTML
        const secureUrl = originalHref.replace('{token}', encodeURIComponent(tokenInput.value));
        tokenContainer.href = secureUrl;
        tokenContainer.textContent = secureUrl; // Відображаємо текст посилання безпечно
    }
}

/**
 * Отримання інформації про чати з Telegram
 */
function telsenderInfo() {
    const tokenField = document.querySelector('[name="tscfwc_setting_token"]');
    if (!tokenField || !tokenField.value) {
        alert("Будь ласка, введіть токен бота");
        return;
    }

    const token = tokenField.value;
    const url = `https://api.telegram.org/bot${token}/getUpdates`;

    // Візуальна індикація завантаження
    const resultContainer = document.querySelector('.result-tested');
    resultContainer.textContent = "Отримання даних...";

    telsenderTestSend(); // Викликаємо тестове повідомлення

    fetch(url)
        .then(res => res.json())
        .then(response => telsenderOut(response))
        .catch(err => {
            resultContainer.textContent = "Помилка запиту: " + err.message;
        });
}

/**
 * Безпечний вивід списку чатів
 */
function telsenderOut(response) {
    const resultContainer = document.querySelector('.result-tested');
    resultContainer.innerHTML = ''; // Очищення контейнера

    if (!response.ok) {
        resultContainer.textContent = "Telegram API Error: " + (response.description || "Unknown");
        return;
    }

    let data = [];
    response.result.forEach(res => {
        if (res.my_chat_member) {
            data.push({ id: res.my_chat_member.chat.id, name: res.my_chat_member.chat.title || "Чат без назви" });
        }
        if (res.message) {
            const user = res.message.from;
            data.push({ id: user.id, name: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Користувач" });
        }
    });

    // Унікалізація
    data = data.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    if (data.length === 0) {
        resultContainer.textContent = "Чати не знайдені. Напишіть щось боту першим.";
        return;
    }

    data.forEach(el => {
        const div = document.createElement('div');
        div.className = 'chat-item-row';
        div.style.padding = '5px 0';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${el.name} : `; // Текст імені захищено

        const boldId = document.createElement('b');
        boldId.textContent = el.id;

        const actionIcon = document.createElement('span');
        actionIcon.className = 'id-chat-list';
        actionIcon.style.cursor = 'pointer';
        actionIcon.style.marginLeft = '10px';
        actionIcon.title = 'Вставити ID у форму';
        actionIcon.innerHTML = ' &#10063;';
        actionIcon.addEventListener('click', () => insertId(el.id));

        div.append(nameSpan, boldId, actionIcon, document.createElement('br'));
        resultContainer.appendChild(div);
    });
}

function insertId(id) {
    const idInput = document.querySelector('[name="tscfwc_setting_chatid"]');
    if (idInput) {
        idInput.value = id;
        // Додамо візуальний ефект успіху
        idInput.style.backgroundColor = '#e1f5fe';
        setTimeout(() => idInput.style.backgroundColor = '', 500);
    }
}

/**
 * Надсилання тестового повідомлення
 */
function telsenderTestSend() {
    const token = document.querySelector('[name="tscfwc_setting_token"]')?.value;
    const chatid = document.querySelector('[name="tscfwc_setting_chatid"]')?.value;

    if (!token || !chatid) return;

    // Використання URLSearchParams для безпечного кодування параметрів
    const params = new URLSearchParams({
        chat_id: chatid,
        text: "Тестове повідомлення: Бот працює! 🙃"
    });

    fetch(`https://api.telegram.org/bot${token}/sendMessage?${params.toString()}`)
        .then(res => res.json())
        .catch(console.error);
}