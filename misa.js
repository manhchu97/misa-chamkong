const axios = require("axios");
const urlLogin = "https://amisapp.misa.vn/APIS/AuthenAPI/api/account/login";
const urlCheckin =
  "https://amisapp.misa.vn/APIS/TimekeeperAPI/api/TimeKeepingRemote/timekeeping-now";
class Misa {
  constructor() {
    this.headers = {
      Host: "amisapp.misa.vn",
      "Content-Type": "application/json; charset=utf-8",
      AppCode: "System",
      DeviceName: "iPhone 13",
      "x-culture": "vi",
      Accept: "*/*",
      AppVersion: "20.1",
      DeviceOS: "IOS",
      "Accept-Language": "vi-VN;q=1.0",
      DeviceType: "Smartphone",
      DeviceId: "93BAB4DB-50F3-4A8C-AF24-2F7D63B87B02",
      "User-Agent":
        "MISA AMIS/20.1 (vn.com.misa.amis; build:1; iOS 17.1.2) Alamofire/5.8.0",
      OSVersion: "17.1.2",
    };
  }

  async http(url, method, headers, data = null) {
    const res = await axios({
      method: method,
      url: url,
      data: data,
      headers,
    });

    return res;
  }

  async login(data) {
    try {
      const res = await this.http(urlLogin, "POST", this.headers, data);
      return res.data;
    } catch (error) {
      return {
        Success: false,
      };
    }
  }

  async checkin(sessionId) {
    let data =
      '{\n    "IsMobile": true,\n    "WifiName": "FETCH - HN",\n    "IsRequireFaceIdentifi": false,\n    "IsWorkRemote": false,\n    "StartWorkingShift": "09:00:00",\n    "ApprovalToID": 0,\n    "IsManagerConfirmTimekeeping": false,\n    "WorkingShiftCode": "HC",\n    "WorkLocationID": 38783,\n    "WorkLocationCode": "fetch01",\n    "Documents": "[]",\n    "IsGPSFixed": false,\n    "ApprovalName": "",\n    "WorkingShiftName": "Ca hành chính",\n    "WorkingShiftID": 13478,\n    "EndWorkingShift": "18:00:00",\n    "WorkLocationName": "FETCH HA NOI"\n}';

    const res = await this.http(
      urlCheckin,
      "POST",
      { ...this.headers, ["x-sessionid"]: sessionId },
      data
    );

    return res.data;
  }

  async chamkong(data) {
    const dataLogin = await this.login({
      username: data.username,
      password: data.password,
    });

    if (!dataLogin.Success) {
      return false;
    }

    const sessionId = dataLogin.Data.User.SessionID;
    const checkin = await this.checkin(sessionId);

    return checkin.Success ? true : false;
  }
}

module.exports = { Misa };
