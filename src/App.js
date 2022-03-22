import React, { useState, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import pako from "pako";
import axios from "axios";

import RecastJS from "Recast";
import { OBJLoader as Loader } from "three/examples/jsm/loaders/OBJLoader";

import "./App.css";

//import terrain from "./vec.json"
const worldOBJPath = "./worldNEW.obj.gz";
const cameraDistance = 120;
const viewSize = [1280, 720];
const toNavCoords = (vec) => {
  return { x: vec.x, y: -vec.y, z: -vec.z };
};
const toThreeCoords = (vec) => {
  return { x: vec.x, y: -vec.y, z: -vec.z };
};

function App() {
  const [loading, setLoading] = useState(0);
  const container = useRef();
  const angle = useRef(0);
  const navMesh = useRef();

  const onWheel = useCallback((event) => {
    let v = angle.current;
    v += event.deltaY / 15;
    v = v % 360;
    angle.current = v;
  });

  useEffect(() => {
    new Promise((res) => {
      axios
        .get(worldOBJPath, { responseType: "arraybuffer" })
        .then((response) => {
          let gz = new Uint8Array(response.data);
          let objstr = pako.inflate(gz);
          let blob = new Blob([objstr], { type: "text/plain" });
          const loader = new Loader();
          loader.load(URL.createObjectURL(blob), (data) => {
            res(data);
          });
        });
    }).then((model) => {
      setLoading(1);

      const mapObject = model.children[0];
      const geo = mapObject.geometry;
      const geoPoses = geo.attributes.position.array;
      const geoIndeces = [];
      for (let i = 0; i < geoPoses.length / 3; i++) {
        geoIndeces.push(i);
      }

      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        2000
      );

      const scene = new THREE.Scene();

      const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 0.8);
      camera.add(pointLight);
      scene.add(camera);

      const renderer = new THREE.WebGLRenderer();
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(viewSize[0], viewSize[1]);
      container.current.appendChild(renderer.domElement);

      scene.add(mapObject);

      function cheese(color) {
        const obj = new THREE.Mesh(
          new THREE.ConeGeometry(),
          new THREE.MeshLambertMaterial({ color })
        );
        obj.position.set(0, 1.5, 0);
        obj.scale.set(1, 3, 1);
        obj.rotateX(Math.PI);
        const parent = new THREE.Object3D();
        parent.add(obj);
        return parent;
      }

      const starter = cheese("green");
      scene.add(starter);
      const ender = cheese("red");
      scene.add(ender);

      const raycaster = new THREE.Raycaster();
      container.current.addEventListener("click", (event) => {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / viewSize[0]) * 2 - 1;
        mouse.y = -(event.clientY / viewSize[1]) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
          console.log(intersects);
          let pointOnGround = intersects.find(
            (point) => point.object.uuid === mapObject.uuid
          ).point;
          const pointNav = pointOnGround;
          if (event.shiftKey) {
            ender.position.set(
              pointOnGround.x,
              pointOnGround.y,
              pointOnGround.z
            );
            ender.positionNav = pointNav;
          } else {
            starter.position.set(
              pointOnGround.x,
              pointOnGround.y,
              pointOnGround.z
            );
            starter.positionNav = pointNav;
          }
        }
        if (navMesh.current) {
          const Vec3 = nav.Vec3;
          const startPoint = toNavCoords(starter.positionNav);
          const startRaw = new Vec3(startPoint.x, startPoint.y, startPoint.z);
          const endPoint = toNavCoords(ender.positionNav);
          const endRaw = new Vec3(endPoint.x, endPoint.y, endPoint.z);
          const path = navMesh.current.computePath(startRaw, endRaw);
          const pathCount = path.getPointCount();

          let pathThree = [];
          for (let i = 0; i < pathCount; i++) {
            pathThree.push(toThreeCoords(path.getPoint(i)));
          }
          console.log(pathThree);

          const lastPath = scene.children.find(
            (child) => child.name === "navigationPath"
          );
          if (lastPath) {
            scene.remove(lastPath);
          }

          let curve = new THREE.CatmullRomCurve3(
            pathThree.map((pos) => new THREE.Vector3(pos.x, pos.y, pos.z))
          );
          let PathCurve = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 20, 0.5, 5, false),
            new THREE.MeshLambertMaterial({ color: "green" })
          );
          PathCurve.name = "navigationPath";
          PathCurve.position.y += 3;
          scene.add(PathCurve);
        }
      });

      container.current.addEventListener("wheel", onWheel);

      const update = () => {
        const rad = (angle.current / 180) * Math.PI;
        camera.position.set(
          Math.sin(rad) * cameraDistance,
          cameraDistance,
          Math.cos(rad) * cameraDistance
        );
        camera.lookAt(scene.position);
      };

      const frame = () => {
        update();
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      };
      frame();

      const onInitNav = () => {
        const config = {
          cs: 0.2,
          ch: 0.2,
          borderSize: 0.5,
          walkableSlopeAngle: 90,
          walkableHeight: 1,
          walkableClimb: 0.7,
          walkableRadius: 0.0001,
          maxEdgeLen: 12,
          maxSimplificationError: 1.3,
          minRegionArea: 8,
          mergeRegionArea: 8,
          maxVertsPerPoly: 6,
          detailSampleDist: 60,
          detailSampleMaxError: 1,
        };
        let rcCfg = new nav.rcConfig();
        for (let key in config) {
          rcCfg[`${key}`] = config[key];
        }
        let nM = new nav.NavMesh();
        const navPoints = [];
        for (let i = 0; i < geoPoses.length; i += 3) {
          const navPoint = toNavCoords({
            x: geoPoses[i],
            y: geoPoses[i + 1],
            z: geoPoses[i + 2],
          });
          navPoints.push(navPoint.x, navPoint.y, navPoint.z);
        }
        nM.build(
          navPoints,
          geoPoses.length,
          geoIndeces,
          geoIndeces.length,
          rcCfg
        );
        navMesh.current = nM;
        setLoading(2);

        var tri;
        var pt;
        var debugNavMesh = nM.getDebugNavMesh();
        let triangleCount = debugNavMesh.getTriangleCount();
        console.log(geoPoses.toString());

        // for (tri = 0; tri < triangleCount * 3; tri++) {
        //   indices.push(tri);
        // }
        for (tri = 0; tri < triangleCount; tri++) {
          var indices = [0, 1, 2];
          var positions = [];

          for (pt = 0; pt < 3; pt++) {
            const point = debugNavMesh.getTriangle(tri).getPoint(pt);
            // positions.push(point.x, point.y, point.z);
            const threePoint = toThreeCoords(point);
            positions.push(threePoint.x, threePoint.y, threePoint.z);
          }

          var mesh = new THREE.BufferGeometry();
          mesh.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(positions), 3)
          );
          mesh.setIndex(indices);

          var debugNavObj = new THREE.Mesh(
            mesh,
            new THREE.MeshBasicMaterial({
              color:
                "#" +
                (
                  "00000" + ((Math.random() * 0x1000000) << 0).toString(16)
                ).substr(-6),
              transparent: true,
              opacity: 0.2,
            })
          );
          debugNavObj.position.y += 0.5;
          scene.add(debugNavObj);
        }
      };
      const nav = RecastJS({ onRuntimeInitialized: onInitNav });
    });
  }, [container]);

  return (
    <div className="App">
      <div className="container" ref={container}></div>
      <div>{loading > 2 ? "Model Loaded" : "Model Loading"}</div>
      <div>{navMesh.current ? "NavMesh Builded" : "NavMesh preparing"}</div>
      <div>Click to set start, Shift+Click to set end, scroll to rotate.</div>
    </div>
  );
}

export default App;
