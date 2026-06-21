'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<string>('chargement ...');

  useEffect(() => {
    fetch("http://localhost:8000/api/ping")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("erreur de connexion"));
  }, []);

  return (
    <main className='flex min-h-screen items-center justify-center'>
      <p className='text-xl'>Statut Backend : {status}</p>
    </main>
  );
}