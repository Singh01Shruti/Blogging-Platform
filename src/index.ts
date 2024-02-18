import { Hono, Context, Next } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { z } from 'zod'
import { Jwt } from 'hono/utils/jwt'
import { authmiddleware } from './auth'



const prisma = new PrismaClient({
  datasourceUrl:"prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiNGRkNjc3ZGEtNTM1Yi00Y2IwLWEwOWMtOTVkMWIwMjliMzVjIiwidGVuYW50X2lkIjoiODE0OTE2Y2RhNGJhZDYwZTdiY2Q2Yjk4YTY0ZDZkZjU1ZjE3MDNmYTVlYzZjNjFiZDU3MjNjYjE2ZTFlZWQ4MCIsImludGVybmFsX3NlY3JldCI6ImE2ODY0YTE5LTgwNWEtNDUzNi1iNTRmLTRmMzcyOGM3ZjVkZSJ9.dMRqnlmjMUPJyOZrY_PMCnllSPeaxjsyBA3-n8kLFw0"
 ,
}).$extends(withAccelerate())

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
  const userId = c.userId;
  const posts = prisma.blog.findMany({});
  const userPosts = prisma.blog.findMany({where : {userId : userId }});

  return c.json({posts, userPosts});
});

const postBody = z.object({
  title : z.string(),       
  body : z.string(),
  tags : z.string().array()
});

app.post('/posts', authmiddleware, async(c) => {
  const userId = c.userId;
  const details = await c.req.json();
  const {success} = postBody.safeParse(details);
  const {title, body, tags} = details; 

  if(!success){
    return c.json(userId);
  }
  
  const tagsOnPostsId = [];
  for(const tag of tags){
    let findTag = await prisma.tag.findFirst({ where :{name : tag }});
    if(!findTag){
      findTag = await prisma.tag.create({data : {name : tag}});
    }
    tagsOnPostsId.push(findTag.id);
  }

  const post = await prisma.blog.create({
    data: {
      title,
      body,
      userId,
      tags: {
        connect: tagsOnPostsId.map((tagId) => ({ id: tagId })),
      },
    },
    select: {
      id: true,
      title: true,
      body: true,
      userId: true,
      tags: { select: { name: true } }, 
    },
  });

 return c.json(post);

});

app.get('/posts/:id', authmiddleware, async(c) => {
  const userId = c.userId;
  const postId = parseInt(c.req.param('id').substring(1));

  const post = await prisma.blog.findFirst({
      where : { 
      id : postId,
      userId : userId
    },
    select :{
      title: true,
      body: true,
      userId: true,
      tags: { select: { name: true } }, 
    },
  });

  return c.json(post);
});

app.put('/posts/:id', authmiddleware, async(c) => {
  const userId = c.userId;
  const postId = parseInt(c.req.param('id').substring(1));
  const details = await c.req.json();
  const {title, body, tags} = details; 

  const tagsOnPostsId = [];
  for(const tag of tags){
      let findTag = await prisma.tag.findFirst({ where :{name : tag }});
      if(!findTag){
        findTag = await prisma.tag.create({data : {name : tag}});
      }
      tagsOnPostsId.push(findTag.id);
  }

  const post = await prisma.blog.findFirst({
      where : { 
      id : postId,
      userId : userId
    },
  });

  if(!post){
    return c.json({message : "No posts available for this ID"})
  }

  const updatedPost = await prisma.blog.update({
    where :{
      id : postId,
      userId : userId
    },
    data: {
      title: title,
      body: body,
      tags :{
        set : tagsOnPostsId.map((tagId) => ({id : tagId}))
      }
    },
    select:{
      title: true,
      body: true,
      userId: true,
      tags: { select: { name: true } }, 
    }
  });

  return c.json(updatedPost);

})

app.delete('/posts/:id', authmiddleware, async(c) => {
  const userId = c.userId;
  const postId = parseInt(c.req.param('id').substring(1));

  const post = await prisma.blog.findFirst({
      where : { 
      id : postId,
      userId : userId
    },
  });

  if(!post){
    return c.json({message : "No posts available for this ID"})
  }

  const deletedPost = await prisma.blog.delete({
      where : { 
      id : postId,
      userId : userId
    },
  });

  return c.json({
    message: "post deleted successfully",
  });

});
export default app
