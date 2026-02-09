import api from "./axios"
import type { LoginProps, LoginResponse, RegisterProps, RegisterResponse } from "@/types/auth"

export const authService = {
  login: (payload: LoginProps) =>
    api.post<LoginResponse>("shared/auth/login", payload),

  register: (payload: RegisterProps) => 
    api.post<RegisterResponse>("shared/auth/register", payload),

  logout: () => {
    localStorage.removeItem("accessToken")
  },
}
