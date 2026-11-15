import {useLayoutEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {useThree} from '@react-three/fiber';
import {Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Texture} from 'three';

/** One shared material per (colour, metalness, map). Static boxes never mutate it. */
const materials=new Map<string,MeshStandardMaterial>();
export function boxMaterial(color:string,metal:number,map?:Texture){
 const key=color+'|'+metal+'|'+(map?.uuid??'');
 let m=materials.get(key);
 if(!m){m=new MeshStandardMaterial({color,map:map??null,roughness:.65,metalness:metal});materials.set(key,m);}
 return m;
}

/**
 * Collapses static unit-cube meshes (userData.staticBox) under this group into one
 * InstancedMesh per material + shadow flags. Originals stay in the tree but hidden,
 * so layout code is unchanged; only the number of draw calls drops.
 * Do not put clickable or animated boxes inside.
 */
export default function StaticInstancer({children}:{children:ReactNode}){
 const root=useRef<Group>(null),invalidate=useThree(s=>s.invalidate);
 useLayoutEffect(()=>{
  const g=root.current;if(!g)return;
  g.updateWorldMatrix(true,true);
  const inverse=new Matrix4().copy(g.matrixWorld).invert();
  const groups=new Map<string,{geometry:any;material:any;cast:boolean;receive:boolean;meshes:Mesh[]}>();
  g.traverse(o=>{
   if(!(o instanceof Mesh)||o instanceof InstancedMesh||!o.userData.staticBox)return;
   const key=(o.material as MeshStandardMaterial).uuid+'|'+o.geometry.uuid+'|'+o.castShadow+'|'+o.receiveShadow;
   if(!groups.has(key))groups.set(key,{geometry:o.geometry,material:o.material,cast:o.castShadow,receive:o.receiveShadow,meshes:[]});
   groups.get(key)!.meshes.push(o);
  });
  const created:InstancedMesh[]=[],hidden:Mesh[]=[],m=new Matrix4();
  for(const {geometry,material,cast,receive,meshes} of groups.values()){
   if(meshes.length<2)continue;
   const inst=new InstancedMesh(geometry,material,meshes.length);
   meshes.forEach((mesh,i)=>{m.multiplyMatrices(inverse,mesh.matrixWorld);inst.setMatrixAt(i,m);mesh.visible=false;hidden.push(mesh);});
   inst.instanceMatrix.needsUpdate=true;inst.castShadow=cast;inst.receiveShadow=receive;inst.computeBoundingSphere();
   inst.userData.staticInstances=meshes.length;
   g.add(inst);created.push(inst);
  }
  invalidate();
  return()=>{created.forEach(i=>{g.remove(i);i.dispose();});hidden.forEach(mesh=>{mesh.visible=true;});};
 },[invalidate]);
 return <group ref={root}>{children}</group>;
}
