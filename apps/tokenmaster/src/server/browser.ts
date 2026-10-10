import { spawn } from "node:child_process";
export function browserCommand(
  url: string,
  platform = process.platform,
): [string, string[]] {
  if (platform === "darwin") return ["open", [url]];
  if (platform === "win32")
    return ["rundll32.exe", ["url.dll,FileProtocolHandler", url]];
  return ["xdg-open", [url]];
}
export async function openBrowser(url: string) {
  const [command, args] = browserCommand(url);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      child.unref();
      resolve();
    }, 3000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Browser opener exited with ${code}.`));
    });
  });
}
