import { initializeSettings } from '../shared/storage';

chrome.runtime.onInstalled.addListener(() => {
  void initializeSettings();
});

chrome.runtime.onStartup?.addListener(() => {
  void initializeSettings();
});
