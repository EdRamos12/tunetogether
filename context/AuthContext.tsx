import React, { useEffect } from "react";
import { useState } from "react";
import axiosInstance from "../utils/axiosInstance";

const AuthContext = React.createContext({} as {
	authState: undefined | boolean,
	authenticateUser: () => void,
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<undefined | boolean>(undefined);

	useEffect(() => {
		authenticateUser();
	}, []);

	function authenticateUser() {
		axiosInstance.get('/verify-auth').then(({ status }) => {
			if (status === 200) setAuthState(true); else setAuthState(false);
		}).catch(() => {
			setAuthState(false);
		})
	}

	// useEffect(() => {
	// 	if (authState !== undefined) alert(authState);
	// }, [authState])

	return <AuthContext.Provider value={{authState, authenticateUser}}>
		{children}
	</AuthContext.Provider>
}

export { AuthContext, AuthProvider }