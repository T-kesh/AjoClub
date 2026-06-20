export function requestNotificationPermission(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission();
    return true;
  }

  return false;
}

export function sendPaymentReminder(
  clubName: string,
  hoursLeft: number,
  amount: string,
  token: string
): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("AjoClub: Payment Due", {
      body: `Your ${amount} ${token} contribution to ${clubName} is due in ${hoursLeft} hours`,
      icon: "/icon-192.png",
    });
  }
}

export function scheduleReminder(
  timestamp: number,
  clubName: string,
  amount: string,
  token: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  const reminderTime = timestamp - 2 * 60 * 60 * 1000; // 2 hours before cycle end

  if (reminderTime > now) {
    const delay = reminderTime - now;
    setTimeout(() => {
      const hoursLeft = Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60));
      sendPaymentReminder(clubName, hoursLeft, amount, token);
    }, delay);
  }
}
