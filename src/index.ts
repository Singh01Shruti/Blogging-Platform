import { Hono, Context, Next } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { Jwt } from 'hono/utils/jwt'
import { authmiddleware } from './auth'
//import { sign } from "hono/jwt";


const prisma = new PrismaClient({
  datasourceUrl:"prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiNGRkNjc3ZGEtNTM1Yi00Y2IwLWEwOWMtOTVkMWIwMjliMzVjIiwidGVuYW50X2lkIjoiODE0OTE2Y2RhNGJhZDYwZTdiY2Q2Yjk4YTY0ZDZkZjU1ZjE3MDNmYTVlYzZjNjFiZDU3MjNjYjE2ZTFlZWQ4MCIsImludGVybmFsX3NlY3JldCI6ImE2ODY0YTE5LTgwNWEtNDUzNi1iNTRmLTRmMzcyOGM3ZjVkZSJ9.dMRqnlmjMUPJyOZrY_PMCnllSPeaxjsyBA3-n8kLFw0"
 ,
}).$extends(withAccelerate())
//const prisma = new PrismaClient().$extends(withAccelerate());
const app = new Hono();
const JWT_SECRET = "saturday";

const signupBody = z.object({
  email : z.string(),       
  password : z.string(),
  firstName : z.string(), 
  lastName : z.string(),
});

app.post('/user/signup', async(c) => {
  const body = await c.req.json();
  const {success} = signupBody.safeParse(body);
  const {email,password,firstName, lastName} = body;

  if(!success){
    return c.json({message : "Invalid arguments"});
  }

  const user = await prisma.user.findFirst({where: {email}});
  if(user){
    return c.json({ message : "User already exists"});
  }

  const res = await prisma.user.create({ data : {email, password,firstName,lastName}});
  if(res){
    return c.json({ message : "Signup successfull"});
  }

});

const signInBody = z.object({
  email : z.string(),       
  password : z.string()
});

app.post('/user/signin', async(c) => {
  const body = await c.req.json();
  const {success} = signInBody.safeParse(body);
  const {email, password} = body;

  if(!success){
    return c.json({ message : "Invalid arguments"});
  }

  const user = await prisma.user.findFirst({where : {email}});

  if(!user || user.password != password){
    return c.json({message : "Invalid email or password"});
  }

  const token = await Jwt.sign(email, JWT_SECRET);
  return c.json({ message: 'Signed in successfully',token });

});

app.get('/posts', authmiddleware, async(c) => {
  const id = c.get('userId');

  const posts = prisma.blog.findMany({});
  const userPosts = prisma.blog.findMany({where : {userId : id }});

  return c.json({posts, userPosts});
});


export default app
