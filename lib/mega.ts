import { Storage, type MutableFile } from "megajs";

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

function findChildByName(node: MutableFile | undefined, name: string): MutableFile | undefined {
  return node?.children?.find((child) => child.name === name);
}

function mkdirPromised(parent: MutableFile, name: string): Promise<MutableFile> {
  return new Promise<MutableFile>((resolve, reject) => {
    parent.mkdir(name, (err, node) => {
      if (err || !node) {
        reject(err ?? new Error("Failed to create MEGA folder"));
        return;
      }
      resolve(node);
    });
  });
}

function uploadPromised(folderNode: MutableFile, filename: string, buffer: Buffer): Promise<MutableFile> {
  return new Promise<MutableFile>((resolve, reject) => {
    folderNode.upload(filename, buffer, (err, uploadedNode) => {
      if (err || !uploadedNode) {
        reject(err ?? new Error("Failed to upload to MEGA"));
        return;
      }
      resolve(uploadedNode);
    });
  });
}

function linkPromised(node: MutableFile): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    node.link(false, (err, link) => {
      if (err || !link) {
        reject(err ?? new Error("Failed to get public MEGA link"));
        return;
      }
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

  const uploaded = await uploadPromised(targetFolder, filename, buffer);
  const publicLink = await linkPromised(uploaded);

  return publicLink;
}
