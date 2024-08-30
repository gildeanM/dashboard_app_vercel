import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { QueryResult, sql } from '@vercel/postgres';
import { prisma } from './app/lib/prisma';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt'
 
async function getUser(email: string) {
    try {
        // const user = await sql<User>`SELECT * FROM users WHERE email=${email}`
        const user = await prisma.users.findUnique({
            where:{
                email
            }
        })
        // return user.rows[0]
        return user
    } catch (error) {
        console.error('Failed to fetch user: ', error)
        throw new Error('Failed to fetch user.')
    }
}

const {pages,callbacks,trustHost,secret} = authConfig

export const { auth, signIn, signOut } = NextAuth({
  
  providers: [Credentials({
    
    async authorize(credentials){
        const parsedCredentials = z.object({
            email: z.string(),
            password: z.string().min(6)
        }).safeParse(credentials)

        if(parsedCredentials.success){
            const { email, password } = parsedCredentials.data
            const user = await getUser(email)
            if(!user) return null;

            const passwordsMatch =  await bcrypt.compare(password, user.password);
            if(passwordsMatch) return user;

        }
        
        return null

    }
    
  })],
  pages,
  callbacks,
  trustHost,
  secret
  
});