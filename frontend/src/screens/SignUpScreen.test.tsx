import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpScreen } from "./SignUpScreen";

// Stand-in for Supabase, so tests never touch the network.
const signUp = vi.fn();
const signInWithPassword = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => signUp(...a),
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
    },
  },
}));

async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.click(screen.getByRole("button", { name: button }));
}

describe("SignUpScreen — sign up", () => {
  beforeEach(() => signUp.mockReset());

  it("sends the email and password to Supabase and asks the user to check their inbox", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u" }, session: null }, error: null });
    render(<SignUpScreen />);
    await fillAndSubmit("Create account");

    expect(signUp).toHaveBeenCalledWith({
      email: "me@example.com",
      password: "correct-horse",
      options: { emailRedirectTo: window.location.origin },
    });
    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
  });

  it("shows Supabase's error on the form", async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Password is too weak" } });
    render(<SignUpScreen />);
    await fillAndSubmit("Create account");

    expect(await screen.findByRole("alert")).toHaveTextContent("Password is too weak");
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
  });
});

describe("SignUpScreen — log in", () => {
  beforeEach(() => signInWithPassword.mockReset());

  it("switches to the log-in form and back, starting each one empty", async () => {
    render(<SignUpScreen />);
    await userEvent.type(screen.getByLabelText("Email"), "half-typed@");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("");

    await userEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });

  it("sends the email and password to Supabase", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    render(<SignUpScreen initialMode="login" />);
    await fillAndSubmit("Log in");

    expect(signInWithPassword).toHaveBeenCalledWith({ email: "me@example.com", password: "correct-horse" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the email and password don't match, without saying which was wrong", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    render(<SignUpScreen initialMode="login" />);
    await fillAndSubmit("Log in");

    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password don't match.");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("tells an unconfirmed user to open their email first", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Email not confirmed" } });
    render(<SignUpScreen initialMode="login" />);
    await fillAndSubmit("Log in");

    expect(await screen.findByRole("alert")).toHaveTextContent("Confirm your email first");
  });
});
