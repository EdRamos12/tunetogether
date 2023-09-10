import '../styles/globals.css';
import 'react-toastify/dist/ReactToastify.min.css';
import type { AppProps } from 'next/app';
import { SocketProvider } from '../context/SocketContext';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '../context/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SocketProvider>
        <Component {...pageProps} />
        <ToastContainer
          position="top-right"
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </SocketProvider>
    </AuthProvider>
  )
}

export default MyApp
