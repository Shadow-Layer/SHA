import { Storage } from "megajs";

let storageInstance: any = null;

export async function getMegaStorage(): Promise<any> {
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

function findChildByName(node: any, name: string) {
  if (!node || !Array.isArray(node.children)) return undefined;
  return node.children.find((c: any) => c.name === name);
}

function mkdirPromised(parent: any, name: string) {
  return new Promise<any>((resolve, reject) => {
    parent.mkdir(name, (err: any, node: any) => {
      if (err) return reject(err);
      resolve(node);
    });
  });
}

function uploadPromised(folderNode: any, opts: any, buffer: Buffer) {
  return new Promise<any>((resolve, reject) => {
    folderNode.upload(opts, buffer, (err: any, uploadedNode: any) => {
      if (err) return reject(err);
      resolve(uploadedNode);
    });
  });
}

function linkPromised(node: any) {
  return new Promise<string>((resolve, reject) => {
    node.link((err: any, link: string) => {
      if (err) return reject(err);
      resolve(link);
    });
  });
}

export async function uploadToMega(buffer: Buffer, filename: string, folder: string): Promise<string> {
  const storage = await getMegaStorage();

  const root = storage.root;

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
