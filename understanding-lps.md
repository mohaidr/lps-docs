
# 🔍 Understanding LPS – More Than Just a Load Testing Tool


See this scenario and think how you could do it using existing load testing tools:
- Send a large number of requests in one burst ✅  
- Wait a bit like for 5 seconds⏱  
- Repeat the same burst and wait again 🔁
- Repeat that operation for 5 mins  
- Or stop the test based on a specific condition ❌

How **straight forward** to acheive this using the tools you know? No that **straight**, righ?

✨ So I thought: what if I could build a tool that gives you **full control with a simple structure**?

That’s how the **LPS structure** came to life:  
**Clients + Rounds + Iterations + Iteration Modes + Termination Rules**

Each one of these components plays a role:

<img src="https://github.com/user-attachments/assets/6796d879-6319-432d-a0e4-c122ec2272d3" width="400" />

---

## 👥 Clients
These are your virtual users.  
Each client runs a group of iterations. You can define how many clients to launch and when — like "start a new client every 3 seconds" — to simulate **gradual user entry** into the system.

---

## 🔁 Rounds
Each Round represents a **phase** of your test.  
You might have a Round with 100 users, another with 1000 — and each round can contain multiple **iterations**, which can be executed **in parallel** or in **flow (sequence)** depending on the behavior you want.

---

## 🔄 Iterations
This is the heart of a round.  
Each iteration defines the target endpoint and a specific **execution behavior**, like:
- Send requests with a fixed number  
- Send requests for a fixed duration  
- Send requests in bursts

---

## 🧠 Iteration Modes
The mode is what makes each iteration smart:
- `D`: Run for a specified duration  
- `R`: Run for a fixed number of requests  
- `DCB`: Burst + Cooldown + Repeat  
- `CB`: Continuous bursts until manually stopped or through a termination rule. Note that the termination rule is currently under development.
...and more!

Each mode gives you a different load shape — **with zero scripting**.

---

## ⏹️ Termination Rules
This will complete the picture.  
You’ll be able to say things like:
- “Stop the test if error rate reaches 5% for 3 seconds in a row - This feature enable you to define what status codes are considered error status codes”  

That means your tests will become **smart, dynamic, and outcome-aware — not just time-based**.

---

## 🎯 Why does this matter?

When you combine all these components:
- **Clients** = simulate real users  
- **Rounds** = simulate stages of your test and load ramp-up  
- **Iterations** = simulate specific user behaviors or request patterns and defines the target endpoint
- **Iteration Modes** = simulate realistic timing and burst patterns  
- **Termination Rules** = allow advanced, intelligent test control

---

🔥 It unlocks the ability to build almost **any load testing scenario you can imagine**...

From the simplest burst load test to highly sensitive API stress scenarios — all of it can be modeled in YAML, or **even without YAML**, using the CLI directly.

---

🔧 Check it out and see what you can do:  
👉 [https://github.com/mohaidr/lps-docs](https://github.com/mohaidr/lps-docs)
