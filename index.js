const express = require("express");
const app = express();
const port = 3000;
const cron = require("node-cron");
const fs = require("fs");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const path = require("path");
const { Misa } = require("./misa");
dayjs.extend(utc);
dayjs.extend(timezone);
// Import telegram bot
require("./telegram");
const { bot } = require("./telegram");

const TIMEZONE = "Asia/Ho_Chi_Minh";

// Route cơ bản để kiểm tra
app.get("/", (req, res) => {
  res.send("Telegram bot đang chạy!");
});

// Khởi chạy server
app.listen(port, () => {
  console.log(`Server bot http://localhost:${port}`);
});

cron.schedule("0 0 * * *", () => {
  const dataPath = path.join(__dirname, "data.json");
  const users = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  users.forEach((user) => {
    user.checkIn = false;
    user.checkOut = false;
  });

  fs.writeFileSync("./data.json", JSON.stringify(users));
});

function syncUser(user) {
  const dataPath = path.join(__dirname, "data.json");
  const users = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const userIndex = users.findIndex((userDb) => userDb.chatId === user.chatId);
  users[userIndex] = user;
  fs.writeFileSync("./data.json", JSON.stringify(users));
}

// Hàm kiểm tra thời gian hiện tại có khớp với lịch trình không
function checkAndSendMessage(user, day, currentTime) {
  const misa = new Misa();
  const schedule = user.schedules[day];
  const { startTime, endTime } = schedule;
  if (!user.checkIn && startTime !== "Nghỉ") {
    if (currentTime >= startTime) {
      const chamkong = misa.chamkong({
        username: user.username,
        password: user.password,
      });

      if (chamkong) {
        bot.sendMessage(user.chatId, "Checkin thành kông !");
      } else {
        bot.sendMessage(user.chatId, "Checkin thất pại!");
      }

      user.checkIn = true;
    }
  }

  if (!user.checkOut && endTime !== "Nghỉ") {
    if (currentTime >= endTime) {
      if (chamkong) {
        bot.sendMessage(user.chatId, "Checkout thành kông !");
      } else {
        bot.sendMessage(user.chatId, "Checkout thất pại!");
      }
      user.checkOut = true;
    }
  }

  syncUser(user);
}

cron.schedule("* * * * *", () => {
  const dataPath = path.join(__dirname, "data.json");
  const users = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const now = dayjs().tz(TIMEZONE); // Thời gian hiện tại theo múi giờ VN
  const currentDay = now.format("dddd"); // Lấy ngày hiện tại (Monday, Tuesday, ...)
  const currentTime = now.format("HH:mm"); // Lấy giờ hiện tại ở định dạng HH:MM

  users.forEach((user) => {
    try {
      if (user.schedules[currentDay]) {
        checkAndSendMessage(user, currentDay, currentTime);
      }
    } catch (error) {
      console.log(error);
    }
  });
});
