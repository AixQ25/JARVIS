const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 显示右键菜单
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  
  // 接收状态更新
  onUpdateState: (callback) => {
    ipcRenderer.on('update-state', (event, data) => callback(data));
  },
  
  // 获取当前状态
  getCurrentState: () => ipcRenderer.invoke('get-current-state'),
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
