import { useEffect, useRef, useState } from 'react';
import { MechanismScene, type ViewName } from '../three/scene';
import type { Readout } from '../core/mechanism';

interface Props {
  readout: Readout;
  view: ViewName;
  xray: boolean;
  explode: number;
  labels: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function SceneView({ readout, view, xray, explode, labels, selected, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<MechanismScene | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let s: MechanismScene | null = null;
    try {
      s = new MechanismScene(host.current, { onSelect });
      scene.current = s;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    return () => {
      s?.dispose();
      scene.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    scene.current?.update(readout);
  }, [readout]);

  useEffect(() => {
    scene.current?.setView(view);
  }, [view]);

  useEffect(() => {
    scene.current?.setXray(xray);
  }, [xray]);

  useEffect(() => {
    scene.current?.setExplode(explode);
  }, [explode]);

  useEffect(() => {
    scene.current?.setLabels(labels);
  }, [labels]);

  useEffect(() => {
    scene.current?.select(selected);
  }, [selected]);

  return (
    <>
      <div className="scene-host" ref={host} />
      {error && (
        <div className="scene-error">
          <b>O desenho 3D não pôde iniciar.</b>
          <p>{error}</p>
          <p>
            Este ambiente não expõe WebGL. Todos os cálculos — efemérides, calendários, validação —
            continuam disponíveis nos painéis laterais e em <code>npm test</code>.
          </p>
        </div>
      )}
    </>
  );
}
