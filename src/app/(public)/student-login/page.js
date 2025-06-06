import Image from "next/image";
import StudentLoginForm from "@/components/Auth/StudentLoginForm";

export default function StudentLoginPage() {
  return (
    <main
      className="d-flex h-100 justify-content-center align-items-center"
      style={{
        backgroundImage:
          "radial-gradient(circle,rgba(116, 204, 248, 0.2) 1px, transparent 1px)",
        backgroundSize: "6px 6px",
        overflowY: "auto",
      }}
    >
      <div className="h-75 w-100 custom-width-sm-min container-md text-center m-0 p-0 rounded-3 shadow border overflow-hidden justify-content-center align-items-center noshadow-sm-max noborder-sm-max bg-white">
        <div className="m-0 p-0 row justify-content-center h-100 overflow-hidden">
          <div
            className="m-0 p-0 col d-none d-lg-block bg-img-r"
            style={{ backgroundImage: "url(/assets/side-design.svg)" }}
          ></div>
          <div className="m-0 p-0 custom-width-md-max custom-height-md-max col-8 d-flex flex-column">
            <div className="d-flex justify-content-center flex-column gap-4 align-items-center flex-shrink-0 pt-5">
              <div className="w-75 h-100">
                <Image
                  src="/assets/logotext.svg"
                  alt="sELECT"
                  width={500}
                  height={200}
                  className="w-100 h-100 object-fit-contain logo-color"
                />
              </div>
            </div>
            <StudentLoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
