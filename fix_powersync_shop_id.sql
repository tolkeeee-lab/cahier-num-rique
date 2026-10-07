-- Run this in your Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_powersync_shop_ids(user_id uuid)
RETURNS json AS $$
DECLARE
  shop_ids json;
BEGIN
  -- Re-use the existing universal security logic (get_user_authorized_shop_ids)
  -- But we must mock the auth.uid() temporarily since PowerSync calls it via a JWT claim, not a standard session.

  -- Assuming the JWT contains the 'sub' claim (which is the user_id)
  -- We fetch all shop IDs this user has access to.
  SELECT json_agg(DISTINCT id) INTO shop_ids FROM (
      -- Shops owned by the user
      SELECT id::VARCHAR FROM public.shops WHERE owner_id = user_id
      UNION
      -- Shops the user is employed at
      SELECT shop_id::VARCHAR FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
         OR id = user_id
  ) AS authorized_shops;

  RETURN COALESCE(shop_ids, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
