require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const fs = require("fs");
const path = require("path");
const { Misa } = require("./misa");

function parseSchedule(text) {
  const lines = text.split("\n");
  const schedule = {};

  lines.forEach((line) => {
    const [day, ...timeParts] = line.split(":"); // Lấy phần trước dấu ":" làm ngày
    const time = timeParts.join(":").trim(); // Ghép lại phần sau dấu ":" để tránh các lỗi do có nhiều dấu ":"

    if (day && time) {
      // Kiểm tra xem có phải là "Nghỉ" hay không
      if (time.toLowerCase() === "nghỉ") {
        schedule[day.trim()] = { startTime: "Nghỉ", endTime: "Nghỉ" };
      } else {
        const [startTime, endTime] = time.split(" ");
        schedule[day.trim()] = { startTime, endTime };
      }
    }
  });

  return schedule;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const dataPath = path.join(__dirname, "data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  if (text === "/help") {
    const helpMessage = `
    Hướng dẫn sử dụng bot:
    - Để kiểm tra settings hiện tại của account nhập:
      /information
    - Để cấu hình username/password, nhập:
      /setting-account <username> <password>
    - Để cấu hình thời gian check-in cho nhiều ngày, nhập:
      /setting-schedule
      Monday: 08:56 18:10
      Tuesday: 08:50 18:05
      Wednesday: 08:40 18:12
      Thursday: 08:36 18:10
      Friday: 08:57 18:20
    `;

    bot.sendMessage(chatId, helpMessage);
  }

  if (text.startsWith("/setting-account")) {
    const misa = new Misa();
    const parts = text.split(" ");
    const username = parts[1];
    const password = parts[2];

    const login = await misa.login({
      username,
      password,
    });

    if (!login.Success) {
      bot.sendMessage(
        chatId,
        `Thông tin tài khoản không đúng vui lòng thử lại sau !`
      );
    } else {
      const newData = data.filter((item) => item.chatId !== chatId);

      const item = {
        username,
        password,
        chatId,
        schedules: {},
      };

      newData.push(item);
      fs.writeFileSync("./data.json", JSON.stringify(newData));
      // Xử lý việc lưu trữ username và password
      bot.sendMessage(chatId, `Đã lưu thông tin tài khoản: ${username}`);
    }
  }

  if (text.startsWith("/setting-schedule")) {
    const indexUser = data.findIndex((item) => item.chatId === chatId);
    if (indexUser === -1) {
      bot.sendMessage(
        chatId,
        "Vui lòng sử dụng cú pháp /setting-account <username> <password> để settings account trước !!!"
      );
    } else {
      const scheduleInput = text.replace("/setting-schedule", "").trim();
      if (!scheduleInput) {
        bot.sendMessage(
          chatId,
          "Vui lòng nhập lịch trình sau lệnh /setting-schedule"
        );
        return;
      }

      const schedule = parseSchedule(scheduleInput);
      data[indexUser].schedules = schedule;
      fs.writeFileSync("./data.json", JSON.stringify(data));
      bot.sendMessage(chatId, "Lưu schedule thành công");
    }
  }

  if (text.startsWith("/information")) {
    // Tìm kiếm người dùng dựa trên chatId
    const user = data.find((item) => item.chatId === chatId);

    // Nếu không tìm thấy user
    if (!user) {
      bot.sendMessage(chatId, "Bạn chưa setting info");
      return;
    }

    // Tạo thông báo chứa thông tin username và password
    let message = `Thông tin của bạn:\n`;
    message += `- Username: ${user.username}\n`;
    message += `- Password: ${user.password}\n`;
    message += `- Schedule:\n`;

    // Duyệt qua từng ngày trong lịch và thêm vào thông báo
    for (const day in user.schedules) {
      const schedule = user.schedules[day];
      message += `  + ${day}: ${schedule.startTime} - ${schedule.endTime}\n`;
    }

    // Gửi thông tin qua Telegram
    bot.sendMessage(chatId, message);
  }
});

module.exports = { bot };
