# Вставьте сюда токен вашего бота, полученный от @BotFather
BOT_TOKEN=заменить на токен без кавычек

# Строка для подключения к вашей базе данных PostgreSQL
# Формат: postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>
#postgresql+asyncpg://postgres:пароль@localhost:5432/postgres
DATABASE_URL=postgresql+asyncpg://postgres:1@localhost:5432/postgres

# Секретный ключ для сессий (сгенерируйте случайную строку)
SESSION_SECRET="Секретный ключ"

# Режим разработки
NODE_ENV=development

# Порт (по умолчанию 3000)
PORT=3000