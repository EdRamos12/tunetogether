import axios from 'axios';
import type { NextPage } from 'next';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import styles from '../styles/Login.module.css';
import TextInput from '../components/TextInput';
import Link from 'next/link';
import { toast } from 'react-toastify';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/screens/Loading';

const Login: NextPage = () => {
  const router = useRouter();
  const {authState} = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTaken, setUsernameTaken] = useState(false);

  const [fetching, setFetching] = useState(false);
  const [usernameFetching, setUsernameFetching] = useState(false);

  useEffect(() => {
    if (authState === true) router.replace('/');
  }, [authState]);

  useEffect(() => {
    if (username.length < 3) return;

    setUsernameFetching(true);

    const getData = setTimeout(() => {
      axiosInstance.get('/username?username='+encodeURIComponent(username)).then((data) => {
        setUsernameTaken(false);
      }).catch((err) => {
        setUsernameTaken(true);
      }).finally(() => {
        setUsernameFetching(false);
      });
    }, 500);
    

    return () => window.clearTimeout(getData);
  }, [username])

  const handleAuthentication = (e: React.FormEvent) => {
    e.preventDefault();

    setFetching(true);
    axios.post('/io/sign-up', {username, email, password}).then(() => {
      Router.push('/');
    }).catch((err) => {
      setFetching(false);
      toast.error(err.response.data.message, {
        theme: "dark",
      });
    });
  }

  function handleDisabledButton() {
    if (email.length !== 0 && password.length !== 0 && !usernameTaken && username.length >= 3) return false;
    
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
            <h3>Create an account</h3>

            <span>Already have an account? <Link href="/login"><strong>Sign in</strong></Link>.</span>

            <TextInput onChange={ (e) => setUsername(e.target.value) } value={username} id="username" required={true} label="Username" minLength={3}/>

            {(!usernameFetching && usernameTaken && username.length >= 3) && <span>Username already taken.</span>}

            {(!usernameFetching && !usernameTaken && username.length >= 3) && <span>Username is free!</span>}

            {usernameFetching && <span>Verifying...</span>}

            <TextInput onChange={ (e) => setEmail(e.target.value) } value={email} id="email" required={true} label="E-mail" type="email" />

            <TextInput onChange={ (e) => setPassword(e.target.value) } value={password} id="pass" required={true} label="Password" type="password" minLength={0} />

            <button type="submit" disabled={handleDisabledButton() || (fetching)} className={styles.loginButton}>
              <strong>Create account!</strong>
            </button>
        </form>
      </div>
      

    </div>
  )
}

export default Login;
