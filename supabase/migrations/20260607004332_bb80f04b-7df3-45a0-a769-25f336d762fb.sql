UPDATE auth.users
SET encrypted_password = crypt('9767MnCraft#', gen_salt('bf')),
    updated_at = now()
WHERE email = 'markusalexnina@gmail.com';