import { Button } from "@/components/Button"
import { Input } from "@/components/Input"
import { Text } from "@/components/Text";
import { useForm } from "react-hook-form";
import type { RegisterProps } from "@/types/auth"
import { authService } from "@/api/auth.service";


const Register = () => {
    const { register, handleSubmit, formState: { errors }, getValues } = useForm<RegisterProps>();

    const handleRegister = async (data: RegisterProps) => {
        try {
            const response = await authService.register(data);
            console.log("login response::", response.data.data);


            const { token, user } = response.data.data

            localStorage.setItem("accessToken", token)

            console.log("Register user:", user);
            // navigate("/dashboard")
        } catch (error) {
            console.error(error)
            // show error message / toast
            console.log("Api error::", error);

        }
    }
    return (
        <div className="flex h-screen w-[vw]">
            {/* Left Column */}
            <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
                <h1>Image here</h1>
            </div>

            {/* Right Column */}
            <div className="flex-1 flex flex-col justify-center p-8">
                <div className="mb-6">
                    <Text as="h1" variant="secondary" className="text-2xl font-bold mb-2 text-left">Join Us</Text>
                    <Text as="p" variant="secondary" className="text-gray-600 text-left">Enter your details to get started with your new account</Text>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(handleRegister)}>

                    <Input label="First Name" placeholder="Enter you First Name" error={errors.firstName?.message} {...register("firstName", { required: "First Name is required" })} />
                    <Input label="Last Name" placeholder="Enter you Last Name" error={errors.lastName?.message} {...register("lastName", { required: "Last Name is required" })} />
                    <Input label="Email" placeholder="Enter your email" className="text-black"
                        error={errors.email?.message}
                        {...register("email", {
                            required: "Email is required",
                            validate: {
                                matchPattren: (value) => /^([\w._-]+)?\w+@[\w-]+(\.\w+)+$/.test(value) || "Email Address must be valid"
                            }
                        })}
                    />
                    <Input
                        label="Password"
                        type="password"
                        showPasswordToggle
                        placeholder="Enter your password"
                        error={errors.password?.message}
                        {...register("password", {
                            required: "Password is required",
                            minLength: {
                                value: 6,
                                message: "Password must be at least 6 characters",
                            },
                        })}
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        showPasswordToggle
                        error={errors.confirmPassword?.message}
                        {...register("confirmPassword", {
                            validate: (value) =>
                                value === getValues("password") || "Passwords do not match",
                        })}
                    />
                    <Text as="p" variant="secondary" className="text-gray-600 text-left">By Clicking Create Account, You agree our Terms of Services and Privacy Policy</Text>

                    <Button variant="primary" type="submit" className="w-full">Create Account</Button>
                </form>

                <div className="flex p-1 justify-center m-2 gap-1.5">
                    <Text as="p" variant="secondary">Already have an account?</Text>
                    <Text as="span" variant="primary">
                        <a href="/login">Sign In</a>
                    </Text>
                </div>
            </div>
        </div>
    )
}

export default Register
