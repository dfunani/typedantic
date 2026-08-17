/** Marker types for constrained string validation (Pydantic-style special types). */

export interface SpecialTypeMarker {
  __specialType: string;
  pattern?: RegExp;
  validator?: (value: string) => boolean;
}

export function EmailStr(): SpecialTypeMarker {
  return {
    __specialType: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  };
}

export function HttpUrl(): SpecialTypeMarker {
  return {
    __specialType: 'url',
    validator: (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
  };
}

export function UUID(): SpecialTypeMarker {
  return {
    __specialType: 'uuid',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  };
}

export function SecretStr(): SpecialTypeMarker {
  return { __specialType: 'secret' };
}

export function isSpecialType(type: unknown): type is SpecialTypeMarker {
  return typeof type === 'object' && type !== null && '__specialType' in type;
}
