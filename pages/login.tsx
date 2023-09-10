import axios from 'axios';
import type { NextPage } from 'next';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import styles from '../styles/Login.module.css';
import TextInput from '../components/TextInput';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/screens/Loading';

const Login: NextPage = () => {
  const router = useRouter();
  const {authState} = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (authState === true) router.replace('/');
  }, [authState]);

  const handleAuthentication = (e: React.FormEvent) => {
    e.preventDefault();

    setFetching(true);
    axios.post('/io/login', {email, password}).then(() => {
      Router.push('/');
    }).catch((err) => {
      setFetching(false);
      toast.error(err.response.data.message, {
        theme: "dark",
      });
    });
  }

  function handleDisabledButton() {
    if (email.length !== 0 && password.length !== 0) {
        return false;
    }
    return true;
  }

  if (authState === undefined || authState === true) {
    return <Loading />;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Login - TuneTogether</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>      

      <div className={styles.mainContainer}>
        <div className={styles.authBg} />

        <form onSubmit={handleAuthentication} className={styles.loginHandler}>            
            <h1>TuneTogether</h1>
            <h3>Login</h3>

            <TextInput onChange={ (e) => setEmail(e.target.value) } value={email} id="email" required={true} label="E-mail" type="email" />

            <TextInput onChange={ (e) => setPassword(e.target.value) } value={password} id="pass" required={true} label="Password" type="password" minLength={0} />
            
            <Link href="/forgot-my-password">Forgot my password</Link>

            <button type="submit" disabled={handleDisabledButton() || fetching} className={styles.loginButton}>
              <strong>Sign in</strong>
            </button>

            <span>Don&apos;t have an account yet? <Link href="/register"><strong>Sign up</strong></Link></span>

            <div className={styles.otherOptionsTitle}>
              {/* Bar before */}
              <div className={styles.bar} />

              <span>or login with</span>

              {/* Bar after */}
              <div className={styles.bar} />
            </div>

            <div className={styles.otherOptionsContainer}>
              <button disabled>
                <svg className={styles.iconMargin} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" height={24} width={24}>
                  {/* ! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. */}
                  <path fill="#ffffff8f" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                </svg>
                Google
              </button>
              <button disabled>
                <svg className={styles.iconMargin} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" height={24} width={24}>
                  {/* ! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. */}
                  <path fill="#ffffff8f" d="M391.17,103.47H352.54v109.7h38.63ZM285,103H246.37V212.75H285ZM120.83,0,24.31,91.42V420.58H140.14V512l96.53-91.42h77.25L487.69,256V0ZM449.07,237.75l-77.22,73.12H294.61l-67.6,64v-64H140.14V36.58H449.07Z"/>
                </svg>
                Twitch
              </button>
            </div>
        </form>
      </div>
      

    </div>
  )
}

export default Login;
