import "@expo/browser-polyfill";

import { Text, View, TouchableOpacity, Dimensions } from "react-native";
import { Camera } from "expo-camera";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { Renderer, TextureLoader } from "expo-three";
import { Gyroscope } from "expo-sensors";
import * as React from "react";
import {
  AmbientLight,
  BoxBufferGeometry,
  Fog,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SpotLight,
  Texture
} from "three";

import Marvin, { MarvinImage, Prewitt } from "./lib/marvin.min";

// -----
// utils
// -----

const now = () => new Date().toLocaleTimeString("fr-FR");

const log = (...args) => console.log(`${now()} => ${args.join(" ")}`);

const tapLog = x => log(x) && x;

// -----
// app
// -----

export default function App() {
  const [refreshCounter, setRefreshCounter] = React.useState(1);

  const [camera, setCamera] = React.useState();
  const [hasPermission, setHasPermission] = React.useState(null);
  const [type, setType] = React.useState(Camera.Constants.Type.back);

  const [threeGl, setGl] = React.useState();
  const [threeCube, setCube] = React.useState();
  const [threeRenderer, setRenderer] = React.useState();
  const [threeScene, setScene] = React.useState();
  const [threeCamera, setThreeCamera] = React.useState();

  const [cubeVisible, setCubeVisible] = React.useState(false);
  const [gyroData, setGyroData] = React.useState({});
  const [gyroSubscription, setGyroSubscription] = React.useState();

  const width = React.useMemo(
    () => Math.round(Dimensions.get("window").width),
    []
  );
  const height = React.useMemo(
    () => Math.round(Dimensions.get("window").height),
    []
  );

  let timeout;

  const requestCameraPermissions = async () => {
    const { status } = await Camera.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const applyTextureAndRender = textureBase64 => {
    log("applyTextureAndRender...");

    const img = new Image();
    const texture = new Texture();

    img.src = textureBase64;

    img.onload = () => {
      texture.image = img;
      texture.needsUpdate = true;

      threeCube.material = new MeshStandardMaterial({
        map: texture
      });
      threeRenderer.render(threeScene, threeCamera);
      threeGl.endFrameEXP();
    };
  };

  /* const whiteToAlpha = (marvinImage, threshold = 120) => {
    let r, g, b;

    /* for (let y = 0; y < marvinImage.getHeight(); y++) {
      for (let x = 0; x < marvinImage.getWidth(); x++) {
        r = marvinImage.getIntComponent0(x, y);
        g = marvinImage.getIntComponent1(x, y);
        b = marvinImage.getIntComponent2(x, y);

        if (r >= threshold && g >= threshold && b >= threshold) {
          marvinImage.setIntColor(x, y, 0);
        }
      }
    } */
  }; */

  /*   const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
    const byteCharacters = Base64.atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }; */

  const takePictureAndProcess = async () => {
    log("takePictureAndProcess...");

    setCubeVisible(true);

    const pictureObj = await camera.takePictureAsync({
      base64: true,
      quality: 0
    });

    applyTextureAndRender(marvinImage.image._base64);

    /* const marvinImage = new MarvinImage();

    marvinImage.load(`data:image/png;base64,${pictureObj.base64}`, () => {
      whiteToAlpha(marvinImage);

      //applyTextureAndRender(`data:image/png;base64,${pictureObj.base64}`);
      applyTextureAndRender(marvinImage.image._base64);
    }); */
  };

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    log("onContextCreate...");

    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x6ad6f0;

    // Create a WebGLRenderer without a DOM element
    const renderer = new Renderer({ gl, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(sceneColor, 0);

    const camera = new PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.set(2, 2, 5);

    const scene = new Scene();
    scene.fog = new Fog(sceneColor, 1, 10000);

    const ambientLight = new AmbientLight(0x101010);
    scene.add(ambientLight);

    const pointLight = new PointLight(0xffffff, 2, 1000, 1);
    pointLight.position.set(0, 200, 200);
    scene.add(pointLight);

    const spotLight = new SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 500, 100);
    spotLight.lookAt(scene.position);
    scene.add(spotLight);

    const cube = new Mesh(
      new BoxBufferGeometry(2.0, 3.0, 1.0),
      new MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0
      })
    );
    scene.add(cube);

    setGl(gl);
    setCube(cube);
    setRenderer(renderer);
    setScene(scene);
    setThreeCamera(camera);

    camera.lookAt(cube.position);

    function update() {}

    // Setup an animation loop
    const render = () => {
      /* timeout = requestAnimationFrame(render);
      update(); */
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  const round = n => {
    if (!n) {
      return 0;
    }

    return Math.floor(n * 100) / 100;
  };

  React.useEffect(() => {
    log("Restarting...");
    setRefreshCounter(refreshCounter + 1);

    requestCameraPermissions();

    setGyroSubscription(
      Gyroscope.addListener(data => {
        setGyroData(data);
      })
    );
    Gyroscope.setUpdateInterval(100);

    // Clear the animation loop when the component unmounts
    return () => {
      clearTimeout(timeout);

      // clear gyro subscription
      gyroSubscription && gyroSubscription.remove();
      setGyroSubscription(null);
    };
  }, []);

  if (hasPermission === null) return <View />;

  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <>
      <View
        style={{
          flex: 1,
          position: "absolute",
          width,
          height
        }}
      >
        <Camera
          ref={ref => {
            setCamera(ref);
          }}
          style={{ flex: 1 }}
          type={type}
          ratio="16:9"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "transparent",
              flexDirection: "row"
            }}
          ></View>
        </Camera>
      </View>

      {refreshCounter % 2 === 0 ? (
        <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
      ) : (
        <></>
      )}

      <TouchableOpacity
        style={{
          flex: 0.08,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: 0xffffff
        }}
        onPress={takePictureAndProcess}
      >
        <Text
          style={{
            fontSize: 18,
            marginBottom: 10,
            color: "white"
          }}
        >
          {" "}
          Render as 3D {round(gyroData.x)}{" "}
        </Text>
      </TouchableOpacity>
    </>
  );
}
