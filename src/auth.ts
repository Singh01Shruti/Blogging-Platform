import { Hono, Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import { Jwt } from 'hono/utils/jwt'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const JWT_SECRET = "saturday";
const prisma = new PrismaClient({
    datasourceUrl:"prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiNGRkNjc3ZGEtNTM1Yi00Y2IwLWEwOWMtOTVkMWIwMjliMzVjIiwidGVuYW50X2lkIjoiODE0OTE2Y2RhNGJhZDYwZTdiY2Q2Yjk4YTY0ZDZkZjU1ZjE3MDNmYTVlYzZjNjFiZDU3MjNjYjE2ZTFlZWQ4MCIsImludGVybmFsX3NlY3JldCI6ImE2ODY0YTE5LTgwNWEtNDUzNi1iNTRmLTRmMzcyOGM3ZjVkZSJ9.dMRqnlmjMUPJyOZrY_PMCnllSPeaxjsyBA3-n8kLFw0"
   ,
  }).$extends(withAccelerate())

declare module 'hono' {
    interface ContextVariableMap{
        userId : number;
    }
}

interface DecodedToken{
    email : string;
}

export const authmiddleware = async (c:Context, next : Next) => {
    const authHeader = c.req.header("Authorization");

    if(!authHeader){
        return c.json({message : 'Unauthorized User'}, 401);
    }

    const token = authHeader.split(' ')[1];

    if(!token){
        return c.json({message : 'Unauthorized User'}, 401);
    }

    try{
        
        const decoded = await Jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findFirst({where : {email : decoded}});

        if(!user){
            return;
        }
        
        
       c.set('userId', 'user.id');
        await next();
    } catch(error) {
        return c.json({ message: 'Unauthorized: Invalid token' }, 401);
    }
    
}