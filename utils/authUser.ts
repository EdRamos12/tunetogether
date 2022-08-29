import { compare } from "bcrypt";

async function authUser(password: string, hash: string, callback: any) {
  //const collection = db.collection('user');
  compare(password, hash, callback);
}

export default authUser;