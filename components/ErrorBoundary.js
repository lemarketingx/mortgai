import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Application render error", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main dir="rtl" className="min-h-screen bg-white px-4 py-16 text-slate-950">
          <section className="mx-auto max-w-xl rounded-[32px] border border-brand-100 bg-brand-50 p-8 text-center shadow-sm">
            <p className="text-sm font-black text-brand-700">שגיאה זמנית</p>
            <h1 className="mt-3 text-3xl font-black">לא הצלחנו לטעון את העמוד כרגע</h1>
            <p className="mt-4 leading-8 text-slate-600">
              אפשר לרענן את העמוד ולהמשיך בבדיקה. הנתונים לא נשלחים עד שלוחצים על כפתור השליחה.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-brand-700 px-7 py-4 font-black text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)]"
            >
              רענון העמוד
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
