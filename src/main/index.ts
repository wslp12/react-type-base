import { app, BrowserWindow } from 'electron';
import ElectronLog from 'electron-log';

ElectronLog.info('Started App - ', 'mode: ', process.env.loaMode);

// 중복 실행 금지
const shouldQuit = app.requestSingleInstanceLock();
if (!shouldQuit) {
  app.quit();
}

function main() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  mainWindow.loadURL('http://localhost:9000/');
}

app.whenReady().then(() => {
  main();
});
