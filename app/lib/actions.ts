'use server';

import { z } from 'zod';
// import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from './prisma';
import bcrypt from 'bcrypt'


const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce
      .number()
      .gt(0, {message: 'Please enter a amount greater than $0'}),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice  status'
    }),
    date: z.string()

})

const FormUserSchema = z.object({
    id: z.string(),
    name: z.string({
      invalid_type_error: 'Por favor escreva seu nome'
    }),
    email: z.string({
      invalid_type_error: 'Por favor escreva seu email'
    }),
    password: z.string({
      invalid_type_error: 'Por favor escreva sua senha'
    })
})


const CreateInvoice = FormSchema.omit({id:true, date:true})
const CreateUser = FormUserSchema.omit({id:true})

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export type UserState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};



export async function createInvoice(prevState: State, formData: FormData){


    const validatedFields =  CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
      
      
       
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }

      const { customerId, amount, status } = validatedFields.data;
      const amountInCents = amount * 100
      // const date = new Date().toISOString().split('T')[0]
      const date = new Date()
    
      
        try {
            // await sql`
            // INSERT INTO invoices (customer_id, amount, status, date)
            // VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
            // `;

            await prisma.invoices.create({
              data: {
                customer_id : customerId,
                amount : amountInCents,
                status,
                date
              }
            })
        } catch (error) {
            return {
            message: 'Database Error: Failed to Create Invoice.',
            };
        }
    
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// ...
 
export async function updateInvoice( id: string, prevState: State, formData: FormData) {

  const validatedFields =  UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  
  
   
if (!validatedFields.success) {
  return {
    errors: validatedFields.error.flatten().fieldErrors,
    message: 'Missing Fields. Failed to Update Invoice.',
  };
}
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    // await sql`
    //     UPDATE invoices
    //     SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    //     WHERE id = ${id}
    //   `;
    await prisma.invoices.update({
      data:{
        customer_id : customerId,
        amount: amountInCents,
        status,
      }, 
      where:{
        id
      }
    })

  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  
    try {
        // await sql`DELETE FROM invoices WHERE id = ${id}`;
        await prisma.invoices.delete({
          where:{
            id
          }
        })
        revalidatePath('/dashboard/invoices');
        
        return { message: 'Deleted Invoice.' };
      } catch (error) {
        return { message: 'Database Error: Failed to Delete Invoice.' };
      }

}


export async function authenticate(
  prevState: string | undefined,
  formData: FormData
){
  try {
    await signIn('credentials', formData)
    
  } catch (error) {
    if(error instanceof AuthError){
      switch(error.type){
        case 'CredentialsSignin' : 
          return 'Invalid credentials';
        default:
          return 'Something went wrong.';
      }
    }
    throw error
  }
}

export async function registerUser(prevState: UserState|undefined, formData: FormData){
 
  const parsedForm = CreateUser.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password')
  })
  
  
  
  //   const parsedForm = z.object({
    //     name: z.string(),
    //     email: z.string(),
    //     password: z.string().min(6)
    //  }).safeParse(formData)
    
    if (!parsedForm.success) {
      return {
        errors: parsedForm.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Register.',
      };
    }
    const { name, email, password } = parsedForm.data
    
    
    try {
      const user = await getUser(email)
      if(user){
        throw new Error('Esse email já está registrado!')
      };

      const cryptedPassword = await bcrypt.hash(password, 3)

      await prisma.users.create({
        data:{
          name,
          email,
          password: cryptedPassword
        }
      })
      await signIn('credentials', { email, password })
      
  } catch (error) {
    return {
      message: 'Database Error: Failed to Register.',
      };
  }finally{
    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

}
