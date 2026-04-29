-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  car_plate TEXT,
  car_model TEXT,
  special_permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets
CREATE TABLE public.wallets (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment methods
CREATE TABLE public.payment_methods (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_brand TEXT NOT NULL,
  last_four TEXT NOT NULL,
  cardholder_name TEXT NOT NULL,
  expiry TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.payment_methods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parking locations (public read)
CREATE TABLE public.parking_locations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  category TEXT NOT NULL DEFAULT 'parking',
  total_spots INTEGER NOT NULL DEFAULT 0,
  available_spots INTEGER NOT NULL DEFAULT 0,
  price_per_hour NUMERIC(6,2) NOT NULL DEFAULT 0,
  has_special_spots BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  rating NUMERIC(2,1) DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view parking" ON public.parking_locations FOR SELECT USING (true);

-- Saved locations
CREATE TABLE public.saved_locations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.parking_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved" ON public.saved_locations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reservations
CREATE TABLE public.reservations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.parking_locations(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(8,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reservations" ON public.reservations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed demo parking locations (São Paulo)
INSERT INTO public.parking_locations (name, address, latitude, longitude, category, total_spots, available_spots, price_per_hour, has_special_spots, rating) VALUES
('Shopping Iguatemi', 'Av. Brigadeiro Faria Lima, 2232 - Jardim Paulistano, São Paulo', -23.5765, -46.6890, 'shopping', 800, 124, 8.00, true, 4.7),
('Hospital Albert Einstein', 'Av. Albert Einstein, 627 - Morumbi, São Paulo', -23.5996, -46.7165, 'hospital', 400, 32, 6.00, true, 4.8),
('Restaurante Fasano', 'R. Vittorio Fasano, 88 - Jardins, São Paulo', -23.5658, -46.6678, 'restaurant', 50, 8, 12.00, false, 4.9),
('Allianz Parque', 'Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo', -23.5275, -46.6786, 'entertainment', 1200, 0, 25.00, true, 4.5),
('Clínica São Vicente', 'R. Joaquim Floriano, 466 - Itaim Bibi, São Paulo', -23.5839, -46.6789, 'clinic', 60, 18, 7.00, true, 4.6),
('Estacionamento Paulista', 'Av. Paulista, 1374 - Bela Vista, São Paulo', -23.5614, -46.6559, 'parking', 200, 45, 9.00, true, 4.3),
('MASP', 'Av. Paulista, 1578 - Bela Vista, São Paulo', -23.5614, -46.6558, 'entertainment', 80, 12, 15.00, false, 4.8),
('Mercado Municipal', 'R. da Cantareira, 306 - Centro, São Paulo', -23.5419, -46.6293, 'shopping', 150, 67, 5.00, false, 4.4);