"use client";

import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useEffect } from 'react';

/**
 * Hook to load GLTF models with DRACO compression
 */
export function useGLTFCompressed(path: string) {
  const gltf = useGLTF(path);

  // Setup DRACO loader if needed
  useEffect(() => {
    // DRACO loader is typically configured globally
    // This is a placeholder for DRACO setup
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    
    // Note: In a real implementation, you'd configure the GLTFLoader
    // to use DRACO loader. This is handled by @react-three/drei's useGLTF
    // when the model is compressed with DRACO.

    return () => {
      dracoLoader.dispose();
    };
  }, [path]);

  return gltf;
}





