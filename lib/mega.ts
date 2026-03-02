import { Storage } from "megajs";

let storageInstance: Storage | null = null;

export async function getMegaStorage(): Promise<Storage> {
  if (storageInstance) {
    return storageInstance;
  }

  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    throw new Error("MEGA credentials not configured");
  }

  const storage = new Storage({ email, password });

  // storage.ready is a promise-like on megajs
  await storage.ready;

  storageInstance = storage;
  return storageInstance;
}

function findChildByName(node: Storage | Record<string, unknown>, name: string): unknown {
  if (!node || typeof node !== "object") return undefined;
  const children = (node as Record<string, unknown>)["children"];
  if (!Array.isArray(children)) return undefined;
  return children.find((c: unknown) => typeof c === "object" && c !== null && "name" in c && (c as Record<string, unknown>)["name"] === name);
}

function mkdirPromised(parent: unknown, name: string): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    if (typeof parent !== "object" || !parent || !("mkdir" in parent)) {
      reject(new Error("Invalid parent node"));
      return;
    }
    const mkdir = (parent as Record<string, unknown>)["mkdir"] as (name: string, cb: (err: unknown, node: unknown) => void) => void;
    mkdir(name, (err: unknown, node: unknown) => {
      if (err) return reject(err);
      resolve(node);
    });
  });
}

function uploadPromised(folderNode: unknown, opts: Record<string, unknown>, buffer: Buffer): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    if (typeof folderNode !== "object" || !folderNode || !("upload" in folderNode)) {
      reject(new Error("Invalid folder node"));
      return;
    }
    const upload = (folderNode as Record<string, unknown>)["upload"] as (opts: Record<string, unknown>, buffer: Buffer, cb: (err: unknown, node: unknown) => void) => void;
    upload(opts, buffer, (err: unknown, uploadedNode: unknown) => {
      if (err) return reject(err);
      resolve(uploadedNode);
    });
  });
}

function linkPromised(node: unknown): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (typeof node !== "object" || !node || !("link" in node)) {
      reject(new Error("Invalid node"));
      return;
    }
    const link = (node as Record<string, unknown>)["link"] as (cb: (err: unknown, link: string) => void) => void;
    link((err: unknown, link: string) => {
      if (err) return reject(err);
      resolve(link);
    });
  });
}

export async function uploadToMega(buffer: Buffer, filename: string, folder: string): Promise<string> {
  const storage = await getMegaStorage();

  const root = storage.root as Storage | Record<string, unknown>;

  // ensure /SHA folder
  let shaNode = findChildByName(root, "SHA");
  if (!shaNode) {
    shaNode = await mkdirPromised(root, "SHA");
  }

  // ensure subfolder
  let targetFolder = findChildByName(shaNode, folder);
  if (!targetFolder) {
    targetFolder = await mkdirPromised(shaNode, folder);
  }

  const uploaded = await uploadPromised(targetFolder, { name: filename }, buffer);
  const publicLink = await linkPromised(uploaded);

  return publicLink;
}
