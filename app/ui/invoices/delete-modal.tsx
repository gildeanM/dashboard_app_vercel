'use client'

import { useEffect, useRef } from "react";

export function DeleteModal({ isOpen, onClose, onConfirm, onDelete }: {isOpen: boolean, onClose:()=>void, onConfirm:()=>void, onDelete: () => {} }){

    const firstButtonRef = useRef<HTMLButtonElement | null>(null); 
    const lastButtonRef = useRef<HTMLButtonElement | null>(null);  

  
    useEffect(() => {
      if (isOpen && firstButtonRef.current) {
        firstButtonRef.current.focus() 
      }
  
      const handleTabPress = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const focusableElements = [firstButtonRef.current, lastButtonRef.current];
  
          
          if (!e.shiftKey && document.activeElement === lastButtonRef.current) {
            e.preventDefault();
            firstButtonRef.current?.focus();
          }
  
          
          if (e.shiftKey && document.activeElement === firstButtonRef.current) {
            e.preventDefault();
            lastButtonRef.current?.focus();
          }
        }
      };
  
      document.addEventListener('keydown', handleTabPress);
  
      return () => {
        document.removeEventListener('keydown', handleTabPress);
      };
    }, [isOpen]);
  
    if(!isOpen) return null;

    return(
        <>
            <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 flex justify-center items-center z-50" >
                <div className="bg-white p-14 rounded-md max-w-96 w-full flex flex-col gap-3" role="dialog" aria-modal>  
                    <h2 className="font-semibold text-lg text-wrap" >Delete Fatura</h2>
                    <div className="flex justify-center">
                        <p className="font-medium text-base text-wrap">Você tem certeza de que quer deletar esta fatura?</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button  className="p-3 border-none bg-gray-200 rounded-md cursor-pointer hover:opacity-80"  ref={firstButtonRef} onClick={onClose} >Cancelar</button>
                        <form action={onDelete}>
                          <button className="p-3 border-none bg-red-600 rounded-md cursor-pointer font-semibold hover:opacity-80" ref={lastButtonRef} type="submit">Deletar</button>
                        </form>
                    </div>
                </div>
            </div>            
        </>
    )
}