import { WASocket, proto } from "@whiskeysockets/baileys";
import { UserSettings } from "@workspace/db";

const FACTS = [
  "🌍 A day on Venus is longer than a year on Venus!",
  "🐘 Elephants are the only animals that can't jump!",
  "🍯 Honey never spoils — archaeologists found 3000-year-old honey still edible!",
  "🦋 Butterflies taste with their feet!",
  "🧠 The human brain is 73% water!",
  "🐬 Dolphins sleep with one eye open!",
  "⚡ Lightning strikes Earth about 100 times per second!",
  "🌙 The Moon is moving away from Earth at 3.8cm per year!",
];

const JOKES = [
  "Why don't scientists trust atoms? 😂\nBecause they make up everything!",
  "Why did the scarecrow win an award? 🏆\nBecause he was outstanding in his field!",
  "What do you call a fish without eyes? 🐟\nA fsh!",
  "Why can't you give Elsa a balloon? 🎈\nBecause she'll let it go!",
  "What do you call cheese that isn't yours? 🧀\nNacho cheese!",
];

const QUOTES = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"In the middle of every difficulty lies opportunity." — Albert Einstein',
  '"It does not matter how slowly you go as long as you do not stop." — Confucius',
  '"Life is what happens to you while you\'re busy making other plans." — John Lennon',
  '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt',
];

const TRUTHS = [
  "What is your biggest fear?",
  "What's the most embarrassing thing you've ever done?",
  "What is your biggest secret?",
  "Have you ever lied to your best friend?",
  "What's the worst thing you've ever done?",
];

const DARES = [
  "Send a silly selfie to the group!",
  "Sing a song and send a voice note!",
  "Do 10 push-ups right now!",
  "Tell us your most embarrassing story!",
  "Send a text to your crush!",
];

const TRIVIA = [
  "🧠 *Trivia:* What is the capital of Australia?\n\n> Canberra!",
  "🧠 *Trivia:* How many bones does an adult human body have?\n\n> 206 bones!",
  "🧠 *Trivia:* What is the smallest planet in our solar system?\n\n> Mercury!",
  "🧠 *Trivia:* Who wrote Romeo and Juliet?\n\n> William Shakespeare!",
  "🧠 *Trivia:* What is the longest river in the world?\n\n> The Nile!",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function handleFunCommand(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  settings: UserSettings,
  _userId: string,
  command: string,
  _args: string[]
): Promise<void> {
  const chatId = msg.key.remoteJid!;

  let text = "";

  switch (command) {
    case "fact":
      text = `🤓 *Random Fact*\n\n${pick(FACTS)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "jokes":
      text = `😄 *Joke Time!*\n\n${pick(JOKES)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "quotes":
      text = `💬 *Quote of the Day*\n\n${pick(QUOTES)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "trivia":
      text = `${pick(TRIVIA)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "truth":
      text = `🎯 *Truth Question*\n\n${pick(TRUTHS)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "dare":
      text = `🔥 *Dare Challenge!*\n\n${pick(DARES)}\n\n_NUTTER-XMD ⚡_`;
      break;
    case "truthordare": {
      const isTruth = Math.random() > 0.5;
      if (isTruth) {
        text = `🎲 *Truth or Dare: TRUTH!*\n\n${pick(TRUTHS)}\n\n_NUTTER-XMD ⚡_`;
      } else {
        text = `🎲 *Truth or Dare: DARE!*\n\n${pick(DARES)}\n\n_NUTTER-XMD ⚡_`;
      }
      break;
    }
    default:
      text = `😄 Fun command: *${command}*\n\n_NUTTER-XMD ⚡_`;
  }

  await sock.sendMessage(chatId, { text }, { quoted: msg }).catch(() => {});
}
