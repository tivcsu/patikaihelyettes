"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import { User, Pharmacy, Substitute, UserRole } from "@/types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  pharmacies: Pharmacy[] | null;
  substitute: Substitute | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  pharmacies: null,
  substitute: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[] | null>(null);
  const [substitute, setSubstitute] = useState<Substitute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Fetch user document
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            // Fetch profile based on role
            if (userData.role === "PHARMACY") {
              const q = query(
                collection(db, "pharmacies"),
                where("userId", "==", firebaseUser.uid)
              );
              const pharmacyDoc = await getDocs(q);

              if (!pharmacyDoc.empty) {
                setPharmacies(
                  pharmacyDoc.docs.map(
                    (doc) =>
                      ({
                        id: doc.id,
                        ...doc.data(),
                      } as Pharmacy)
                  )
                );
              }
              setSubstitute(null);
            } else if (userData.role === "SUBSTITUTE") {
              const substituteDoc = await getDoc(
                doc(db, "substitutes", firebaseUser.uid)
              );
              if (substituteDoc.exists()) {
                setSubstitute({
                  id: substituteDoc.id,
                  ...substituteDoc.data(),
                } as Substitute);
              }
              setPharmacies(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setPharmacies(null);
        setSubstitute(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setPharmacies(null);
      setSubstitute(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    firebaseUser,
    user,
    pharmacies,
    substitute,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
