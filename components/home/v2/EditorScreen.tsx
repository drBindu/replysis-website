import React from "react";

/** A code editor with a problem open, the thing a candidate shares during a technical interview. */
export default function EditorScreen() {
  return (
    <div className="hv2-editor" aria-hidden>
      <div className="hv2-editor-top">
        <b>two_sum.py</b>
        <span>notes.md</span>
        <span>tests.py</span>
      </div>
      <div className="hv2-editor-body">
        <span className="ln">1{"\n"}2{"\n"}3{"\n"}4{"\n"}5</span>
        <code>
          <span className="hv2-k">from</span> typing <span className="hv2-k">import</span> List{"\n"}
          {"\n"}
          <span className="hv2-k">class</span> <span className="hv2-f">Solution</span>:{"\n"}
          {"    "}<span className="hv2-k">def</span> <span className="hv2-f">twoSum</span>(self, nums: List[<span className="hv2-f">int</span>], target: <span className="hv2-f">int</span>):{"\n"}
          {"        "}<span className="hv2-c"># return the indices of the two numbers that add up to target</span>
        </code>
      </div>
      <div className="hv2-problem">
        <b>1. Two Sum.</b> Given an array of integers and a target, return the indices of the two numbers that add up to it. You may
        assume exactly one solution exists, and you may not use the same element twice.
      </div>
    </div>
  );
}
