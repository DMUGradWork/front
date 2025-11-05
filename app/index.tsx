import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Entry(): JSX.Element {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('auth_token')
      .then((token) => {
        setHasToken(!!token);
      })
      .catch(() => {
        setHasToken(false);
      });
  }, []);

  if (hasToken === null) {
    return null;
  }

  return <Redirect href={hasToken ? '/main' : '/login'} />;
}
